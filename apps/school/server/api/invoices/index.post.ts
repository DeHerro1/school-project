import { createInvoiceSchema, Role } from "@repo/shared";
import type { InvoiceDoc, StudentDoc } from "../../utils/firebase";

// Admin issues an invoice for a student's fees. Notifies parents.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN]);
  const body = await validateBody(event, createInvoiceSchema);
  await assertStudentInSchool(body.studentId, user.schoolId);

  const doc: InvoiceDoc = {
    studentId: body.studentId,
    term: body.term,
    amount: body.amount,
    dueDate: new Date(body.dueDate).toISOString(),
    status: "UNPAID",
    createdAt: new Date().toISOString(),
    schoolId: user.schoolId,
  };
  // A cuid-shaped id (see server/utils/id.ts) — recordPaymentSchema.invoiceId
  // validates it with `.cuid()`, so this can't be Firestore/the mock's own
  // auto-id (neither is "c"-prefixed).
  const id = newId();
  await collections.invoices().doc(id).set(doc);

  const studentSnap = await collections.students().doc(body.studentId).get();
  const student = studentSnap.exists ? (studentSnap.data() as StudentDoc) : null;
  const guardians = await guardianUserIds(body.studentId);
  await Promise.all(
    guardians.map((userId) =>
      notify({
        userId,
        type: "INVOICE_ISSUED",
        title: `New invoice for ${student?.firstName ?? "your child"}`,
        body: `${doc.term}: ${doc.amount}`,
        data: { invoiceId: id, studentId: body.studentId },
      }),
    ),
  );

  setResponseStatus(event, 201);
  return { invoice: { id, ...doc, payments: [] } };
});
