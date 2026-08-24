import { Role, AttendanceStatus } from "@repo/shared";
import type { AttendanceDoc, TimetableSlotDoc } from "../../utils/firebase";

// Dashboard overview — headline figures for admins and staff.
export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const today = dateOnly();
  const day = currentWeekday();

  const [
    teachersSnap,
    totalStudentsSnap,
    totalClassesSnap,
    pendingAlertsSnap,
    todayAttendanceSnap,
    timetableSnap,
  ] = await Promise.all([
    collections.users().where("role", "==", Role.TEACHER).count().get(),
    collections.students().count().get(),
    collections.classes().count().get(),
    collections.absenceAlerts().where("status", "==", "PENDING").count().get(),
    collections.attendance().where("date", "==", today).get(),
    collections.timetableSlots().where("day", "==", day).get(),
  ]);

  const totalTeachers = teachersSnap.data().count;
  const todayAttendance = todayAttendanceSnap.docs.map((d) => d.data() as AttendanceDoc);
  const presentStudents = todayAttendance.filter(
    (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
  ).length;
  const absentStudents = todayAttendance.filter((r) => r.status === AttendanceStatus.ABSENT).length;

  // Teachers with at least one timetable slot today are "available".
  const availableTeachers = new Set(
    timetableSnap.docs
      .map((d) => (d.data() as TimetableSlotDoc).teacherId)
      .filter((id): id is string => !!id),
  ).size;
  const unavailableTeachers = Math.max(0, totalTeachers - availableTeachers);

  return {
    totalTeachers,
    availableTeachers,
    unavailableTeachers,
    totalStudents: totalStudentsSnap.data().count,
    presentStudents,
    absentStudents,
    totalClasses: totalClassesSnap.data().count,
    pendingAlerts: pendingAlertsSnap.data().count,
  };
});
