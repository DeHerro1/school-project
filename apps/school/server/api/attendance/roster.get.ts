import { Role } from "@repo/shared";
import type { StudentDoc, AttendanceDoc, AbsenceAlertDoc } from "../../utils/firebase";

// Roster + existing attendance for a class on a given day (teacher marking view)
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const query = getQuery(event);
  const classId = typeof query.classId === "string" ? query.classId : undefined;
  if (!classId) throw httpError(400, "classId is required");

  // Homeroom teachers may only load the roster for their own class.
  if (user.role === Role.TEACHER) await assertTeacherOwnsClass(user.id, classId);

  const date = dateOnly(typeof query.date === "string" ? query.date : undefined);

  const studentsSnap = await collections.students().where("classId", "==", classId).get();
  const students = studentsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as StudentDoc) }))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));

  const attendanceDocs = students.length
    ? await adminDb().getAll(
        ...students.map((s) => collections.attendance().doc(`${s.id}_${date}`)),
      )
    : [];
  const attendanceByStudent = new Map(
    attendanceDocs.filter((d) => d.exists).map((d) => [d.id, { id: d.id, ...(d.data() as AttendanceDoc) }]),
  );

  const alertIds = [...attendanceByStudent.keys()];
  const alertDocs = alertIds.length
    ? await adminDb().getAll(...alertIds.map((id) => collections.absenceAlerts().doc(id)))
    : [];
  const alertByAttendanceId = new Map(
    alertDocs.filter((d) => d.exists).map((d) => [d.id, { id: d.id, ...(d.data() as AbsenceAlertDoc) }]),
  );

  return {
    date: new Date(`${date}T00:00:00.000Z`).toISOString(),
    students: students.map((s) => {
      const attendanceId = `${s.id}_${date}`;
      const attendance = attendanceByStudent.get(attendanceId);
      return {
        ...s,
        attendance: attendance
          ? [{ ...attendance, alert: alertByAttendanceId.get(attendanceId) ?? null }]
          : [],
      };
    }),
  };
});
