import { markAttendanceSchema, Role } from "@repo/shared";
import type { AttendanceDoc, AbsenceAlertDoc } from "../../utils/firebase";

// Mark one student — only staff (teachers) may mark attendance, not admins.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.TEACHER]);
  const body = await validateBody(event, markAttendanceSchema);

  // A teacher may only mark students in their own homeroom class.
  await assertTeacherOwnsStudent(user.id, body.studentId);

  const date = dateOnly(body.date);
  const id = `${body.studentId}_${date}`;
  const ref = collections.attendance().doc(id);
  const existing = await ref.get();

  const doc: AttendanceDoc = {
    studentId: body.studentId,
    date,
    status: body.status,
    markedById: user.id,
    createdAt: existing.exists ? (existing.data() as AttendanceDoc).createdAt : new Date().toISOString(),
  };
  await ref.set(doc);

  const alertSnap = await collections.absenceAlerts().doc(id).get();
  const record = {
    id,
    ...doc,
    alert: alertSnap.exists ? { id, ...(alertSnap.data() as AbsenceAlertDoc) } : null,
  };
  return { record };
});
