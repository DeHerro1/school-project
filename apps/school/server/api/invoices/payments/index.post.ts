import { recordPaymentSchema, Role, InvoiceStatus } from "@repo/shared";
import type { InvoiceDoc, PaymentDoc } from "../../../utils/firebase";

// Record a payment against an invoice and recompute its status.
export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN]);
  const body = await validateBody(event, recordPaymentSchema);

  const invoiceRef = collections.invoices().doc(body.invoiceId);
  const invoiceSnap = await invoiceRef.get();
  if (!invoiceSnap.exists) throw httpError(404, "Invoice not found");
  const invoice = invoiceSnap.data() as InvoiceDoc;

  const paymentDoc: PaymentDoc = {
    invoiceId: body.invoiceId,
    amount: body.amount,
    method: body.method,
    createdAt: new Date().toISOString(),
  };
  const paymentId = newId();
  await collections.payments().doc(paymentId).set(paymentDoc);

  const existing = await collections.payments().where("invoiceId", "==", body.invoiceId).get();
  const paid = existing.docs.reduce((s, d) => s + (d.data() as PaymentDoc).amount, 0);
  const status = paid >= invoice.amount ? InvoiceStatus.PAID : paid > 0 ? InvoiceStatus.PARTIAL : InvoiceStatus.UNPAID;
  await invoiceRef.update({ status });

  const updatedSnap = await invoiceRef.get();
  const payments = existing.docs.map((d) => ({ id: d.id, ...(d.data() as PaymentDoc) }));

  setResponseStatus(event, 201);
  return {
    payment: { id: paymentId, ...paymentDoc },
    invoice: { id: body.invoiceId, ...(updatedSnap.data() as InvoiceDoc), payments },
  };
});
