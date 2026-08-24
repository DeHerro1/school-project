import { Role } from "@repo/shared";
import type { AttendanceDoc, AbsenceAlertDoc } from "../../utils/firebase";

// Attendance history for a student — parents scoped to their own children.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const query = getQuery(event);
  const studentId = typeof query.studentId === "string" ? query.studentId : undefined;
  if (!studentId) throw httpError(400, "studentId is required");
  if (user.role === Role.PARENT) await assertParentOwnsStudent(user.id, studentId);

  const snap = await collections.attendance().where("studentId", "==", studentId).get();
  const records = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as AttendanceDoc) }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 60);

  const alertDocs = records.length
    ? await adminDb().getAll(...records.map((r) => collections.absenceAlerts().doc(r.id)))
    : [];
  const alertById = new Map(alertDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as AbsenceAlertDoc]));

  return {
    records: records.map((r) => ({ ...r, alert: alertById.has(r.id) ? { id: r.id, ...alertById.get(r.id)! } : null })),
  };
});
