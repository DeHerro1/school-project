import { Router } from "express";
import {
  createInvoiceSchema,
  recordPaymentSchema,
  Role,
  InvoiceStatus,
  SocketEvents,
} from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler, AppError } from "../middleware/error";
import { assertParentOwnsStudent, guardianUserIds } from "../services/access";
import { notify, emitTo } from "../lib/socket";

export const invoicesRouter = Router();

// List invoices. Parents scope by their child; staff can list all or by student.
invoicesRouter.get(
  "/",
  authGuard(),
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId as string | undefined;
    if (req.user!.role === Role.PARENT) {
      if (!studentId) throw new AppError(400, "studentId is required");
      await assertParentOwnsStudent(req.user!.sub, studentId);
    }
    const invoices = await prisma.invoice.findMany({
      where: studentId ? { studentId } : undefined,
      include: {
        payments: true,
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dueDate: "desc" },
    });
    res.json({ invoices });
  }),
);

invoicesRouter.post(
  "/",
  authGuard([Role.ADMIN]),
  validate(createInvoiceSchema),
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.create({ data: req.body });

    const student = await prisma.student.findUnique({
      where: { id: invoice.studentId },
      select: { firstName: true },
    });
    const guardians = await guardianUserIds(invoice.studentId);
    await Promise.all(
      guardians.map((userId) =>
        notify({
          userId,
          type: "INVOICE_ISSUED",
          title: `New invoice for ${student?.firstName ?? "your child"}`,
          body: `${invoice.term}: ${invoice.amount}`,
          data: { invoiceId: invoice.id, studentId: invoice.studentId },
        }),
      ),
    );
    guardians.forEach((userId) =>
      emitTo(userId, SocketEvents.INVOICE_ISSUED, { invoiceId: invoice.id }),
    );

    res.status(201).json({ invoice });
  }),
);

// Record a payment and recompute the invoice status
invoicesRouter.post(
  "/payments",
  authGuard([Role.ADMIN]),
  validate(recordPaymentSchema),
  asyncHandler(async (req, res) => {
    const { invoiceId, amount, method } = req.body;
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw new AppError(404, "Invoice not found");

    const payment = await prisma.payment.create({
      data: { invoiceId, amount, method },
    });

    const paid = invoice.payments.reduce((s, p) => s + p.amount, 0) + amount;
    const status =
      paid >= invoice.amount
        ? InvoiceStatus.PAID
        : paid > 0
          ? InvoiceStatus.PARTIAL
          : InvoiceStatus.UNPAID;
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
      include: { payments: true },
    });

    res.status(201).json({ payment, invoice: updated });
  }),
);
