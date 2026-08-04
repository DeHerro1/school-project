import { Router } from "express";
import { Role, AttendanceStatus } from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";

export const statsRouter = Router();

const todayUtc = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const weekday = () => ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date().getUTCDay()];

// Dashboard overview — headline figures for admins and staff.
statsRouter.get(
  "/overview",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (_req, res) => {
    const today = todayUtc();
    const day = weekday();

    const [
      totalTeachers,
      totalStudents,
      totalClasses,
      pendingAlerts,
      todayAttendance,
      teachersScheduledToday,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.TEACHER } }),
      prisma.student.count(),
      prisma.class.count(),
      prisma.absenceAlert.count({ where: { status: "PENDING" } }),
      // All student attendance records for today.
      prisma.attendance.findMany({
        where: { date: today },
        select: { status: true },
      }),
      // Teachers with at least one timetable slot today are "available".
      prisma.timetable.findMany({
        where: { day: day as any, teacherId: { not: null } },
        select: { teacherId: true },
        distinct: ["teacherId"],
      }),
    ]);

    const presentStudents = todayAttendance.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
    ).length;
    const absentStudents = todayAttendance.filter(
      (r) => r.status === AttendanceStatus.ABSENT,
    ).length;

    const availableTeachers = teachersScheduledToday.length;
    const unavailableTeachers = Math.max(0, totalTeachers - availableTeachers);

    res.json({
      totalTeachers,
      availableTeachers,
      unavailableTeachers,
      totalStudents,
      presentStudents,
      absentStudents,
      totalClasses,
      pendingAlerts,
    });
  }),
);
