import { Role, AttendanceStatus } from "@repo/shared";
import type { AttendanceDoc, TimetableSlotDoc, AbsenceAlertDoc } from "../../utils/firebase";

// Dashboard overview — headline figures for admins and staff, scoped to
// their own school. Attendance, timetable slots and absence alerts don't
// carry a schoolId of their own, so they're resolved via the school's own
// students/classes (fetched once below) instead of counted globally.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const today = dateOnly();
  const day = currentWeekday();

  const [
    teachersSnap,
    studentsSnap,
    classesSnap,
    pendingAlertsSnap,
    todayAttendanceSnap,
    timetableSnap,
  ] = await Promise.all([
    collections.users().where("role", "==", Role.TEACHER).where("schoolId", "==", user.schoolId).count().get(),
    collections.students().where("schoolId", "==", user.schoolId).get(),
    collections.classes().where("schoolId", "==", user.schoolId).get(),
    collections.absenceAlerts().where("status", "==", "PENDING").get(),
    collections.attendance().where("date", "==", today).get(),
    collections.timetableSlots().where("day", "==", day).get(),
  ]);

  const ownStudentIds = new Set(studentsSnap.docs.map((d) => d.id));
  const ownClassIds = new Set(classesSnap.docs.map((d) => d.id));

  const totalTeachers = teachersSnap.data().count;
  const todayAttendance = todayAttendanceSnap.docs
    .map((d) => d.data() as AttendanceDoc)
    .filter((r) => ownStudentIds.has(r.studentId));
  const presentStudents = todayAttendance.filter(
    (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
  ).length;
  const absentStudents = todayAttendance.filter((r) => r.status === AttendanceStatus.ABSENT).length;

  // Teachers with at least one of the school's own timetable slots today are
  // "available".
  const availableTeachers = new Set(
    timetableSnap.docs
      .map((d) => d.data() as TimetableSlotDoc)
      .filter((s) => ownClassIds.has(s.classId))
      .map((s) => s.teacherId)
      .filter((id): id is string => !!id),
  ).size;
  const unavailableTeachers = Math.max(0, totalTeachers - availableTeachers);

  // Pending alerts belong to the school if their attendance record's student
  // does — resolved via one batched lookup rather than N queries.
  const pendingAlerts = pendingAlertsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as AbsenceAlertDoc) }));
  const alertAttendanceDocs = pendingAlerts.length
    ? await adminDb().getAll(...pendingAlerts.map((a) => collections.attendance().doc(a.attendanceId)))
    : [];
  const pendingAlertCount = alertAttendanceDocs.filter(
    (d) => d.exists && ownStudentIds.has((d.data() as AttendanceDoc).studentId),
  ).length;

  return {
    totalTeachers,
    availableTeachers,
    unavailableTeachers,
    totalStudents: ownStudentIds.size,
    presentStudents,
    absentStudents,
    totalClasses: ownClassIds.size,
    pendingAlerts: pendingAlertCount,
  };
});
