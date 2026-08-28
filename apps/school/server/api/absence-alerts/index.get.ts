import { Role } from "@repo/shared";
import type { AbsenceAlertDoc, AttendanceDoc, StudentDoc } from "../../utils/firebase";

// List recent absence alerts — parents only see alerts for their own
// children; staff only see alerts for their own school's students.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);

  const snap = await collections.absenceAlerts().get();
  let alerts = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as AbsenceAlertDoc) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Resolve attendance -> student up front (once) so both the ownership
  // filter below and the response payload reuse the same fetch.
  const attendanceDocs = alerts.length
    ? await adminDb().getAll(...alerts.map((a) => collections.attendance().doc(a.attendanceId)))
    : [];
  const attendanceById = new Map(
    attendanceDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as AttendanceDoc]),
  );
  const studentIds = [...new Set([...attendanceById.values()].map((a) => a.studentId))];
  const studentDocs = studentIds.length
    ? await adminDb().getAll(...studentIds.map((id) => collections.students().doc(id)))
    : [];
  const studentById = new Map(studentDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as StudentDoc]));

  if (user.role === Role.PARENT) {
    const myStudentIds = new Set(await parentStudentIds(user.id));
    alerts = alerts.filter((a) => myStudentIds.has(attendanceById.get(a.attendanceId)?.studentId ?? ""));
  } else {
    alerts = alerts.filter((a) => {
      const studentId = attendanceById.get(a.attendanceId)?.studentId;
      return !!studentId && studentById.get(studentId)?.schoolId === user.schoolId;
    });
  }
  alerts = alerts.slice(0, 50);

  return {
    alerts: alerts.map((a) => {
      const attendance = attendanceById.get(a.attendanceId);
      const student = attendance ? studentById.get(attendance.studentId) : undefined;
      return {
        ...a,
        attendance: attendance && {
          ...attendance,
          id: a.attendanceId,
          student: student && {
            id: attendance.studentId,
            firstName: student.firstName,
            lastName: student.lastName,
            photoUrl: student.photoUrl,
          },
        },
      };
    }),
  };
});
