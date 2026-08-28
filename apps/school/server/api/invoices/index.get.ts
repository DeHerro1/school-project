import { Role } from "@repo/shared";
import type { InvoiceDoc, PaymentDoc, StudentDoc } from "../../utils/firebase";

// List invoices. Staff (no studentId) see the whole school; parents are
// always scoped to one of their own children.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const query = getQuery(event);
  const studentId = typeof query.studentId === "string" ? query.studentId : undefined;
  if (user.role === Role.PARENT) {
    if (!studentId) throw httpError(400, "studentId is required");
    await assertParentOwnsStudent(user.id, studentId);
  } else if (studentId) {
    await assertStudentInSchool(studentId, user.schoolId);
  }

  let ref = collections.invoices() as FirebaseFirestore.Query;
  ref = studentId ? ref.where("studentId", "==", studentId) : ref.where("schoolId", "==", user.schoolId);
  const snap = await ref.get();
  const invoices = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as InvoiceDoc) }))
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  const studentIds = [...new Set(invoices.map((i) => i.studentId))];
  const studentDocs = studentIds.length
    ? await adminDb().getAll(...studentIds.map((id) => collections.students().doc(id)))
    : [];
  const studentById = new Map(studentDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as StudentDoc]));

  const paymentsByInvoice = new Map<string, ({ id: string } & PaymentDoc)[]>();
  for (const inv of invoices) {
    const ps = await collections.payments().where("invoiceId", "==", inv.id).get();
    paymentsByInvoice.set(inv.id, ps.docs.map((d) => ({ id: d.id, ...(d.data() as PaymentDoc) })));
  }

  return {
    invoices: invoices.map((inv) => ({
      ...inv,
      payments: paymentsByInvoice.get(inv.id) ?? [],
      student: studentById.has(inv.studentId)
        ? {
            id: inv.studentId,
            firstName: studentById.get(inv.studentId)!.firstName,
            lastName: studentById.get(inv.studentId)!.lastName,
          }
        : null,
    })),
  };
});
