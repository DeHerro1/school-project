import { respondAlertSchema, Role } from "@repo/shared";
import type { AbsenceAlertDoc, AttendanceDoc } from "../../../utils/firebase";

// Parent responds with the reason for the absence.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.PARENT]);
  const id = getRouterParam(event, "id")!;
  const body = await validateBody(event, respondAlertSchema);

  const ref = collections.absenceAlerts().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw httpError(404, "Alert not found");
  const alert = snap.data() as AbsenceAlertDoc;

  const attendanceSnap = await collections.attendance().doc(alert.attendanceId).get();
  if (!attendanceSnap.exists) throw httpError(404, "Attendance record not found");
  const attendance = attendanceSnap.data() as AttendanceDoc;
  await assertParentOwnsStudent(user.id, attendance.studentId);

  if (alert.status === "RESPONDED") throw httpError(409, "You have already responded to this alert");

  await ref.update({
    parentReason: body.parentReason,
    status: "RESPONDED",
    respondedAt: new Date().toISOString(),
  });

  await notify({
    userId: attendance.markedById,
    type: "ALERT_RESPONDED",
    title: "Reason provided for an absence",
    body: body.parentReason,
    data: { alertId: id, studentId: attendance.studentId },
  });

  const updated = await ref.get();
  return { alert: { id, ...(updated.data() as AbsenceAlertDoc) } };
});
