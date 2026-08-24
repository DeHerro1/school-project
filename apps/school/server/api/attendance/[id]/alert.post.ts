import { raiseAlertSchema, Role, AttendanceStatus } from "@repo/shared";
import type { AttendanceDoc, AbsenceAlertDoc, StudentDoc } from "../../../utils/firebase";

// Raise an absence alert to the student's parents — staff (teachers) only,
// since it follows on from marking a student absent.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.TEACHER]);
  const attendanceId = getRouterParam(event, "id")!;
  const body = await validateBody(event, raiseAlertSchema);

  const attendanceSnap = await collections.attendance().doc(attendanceId).get();
  if (!attendanceSnap.exists) throw httpError(404, "Attendance record not found");
  const attendance = attendanceSnap.data() as AttendanceDoc;

  // Only the student's own homeroom teacher may raise the alert.
  await assertTeacherOwnsStudent(user.id, attendance.studentId);
  if (attendance.status !== AttendanceStatus.ABSENT) {
    throw httpError(400, "Alerts can only be raised for absent students");
  }

  const alertRef = collections.absenceAlerts().doc(attendanceId);
  if ((await alertRef.get()).exists) throw httpError(409, "An alert has already been raised");

  const studentSnap = await collections.students().doc(attendance.studentId).get();
  const student = studentSnap.data() as StudentDoc;

  const doc: AbsenceAlertDoc = {
    attendanceId,
    message: body.message,
    parentReason: null,
    status: "PENDING",
    respondedAt: null,
    createdAt: new Date().toISOString(),
  };
  await alertRef.set(doc);

  const guardians = await guardianUserIds(attendance.studentId);
  await Promise.all(
    guardians.map((userId) =>
      notify({
        userId,
        type: "ABSENCE_ALERT",
        title: `${student.firstName} is marked absent`,
        body: body.message,
        data: { alertId: attendanceId, studentId: attendance.studentId },
      }),
    ),
  );

  setResponseStatus(event, 201);
  return { alert: { id: attendanceId, ...doc } };
});
