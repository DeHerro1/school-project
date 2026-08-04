import { Router } from "express";
import {
  markAttendanceSchema,
  bulkAttendanceSchema,
  raiseAlertSchema,
  Role,
  AttendanceStatus,
  SocketEvents,
} from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler, AppError } from "../middleware/error";
import {
  assertParentOwnsStudent,
  assertTeacherOwnsClass,
  assertTeacherOwnsStudent,
  guardianUserIds,
} from "../services/access";
import { notify, emitTo } from "../lib/socket";

export const attendanceRouter = Router();

/** Normalise any date to UTC midnight so one row exists per student per day. */
function dateOnly(input?: Date): Date {
  const d = input ? new Date(input) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Roster + existing attendance for a class on a given day (teacher marking view)
attendanceRouter.get(
  "/roster",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (req, res) => {
    const classId = req.query.classId as string;
    if (!classId) throw new AppError(400, "classId is required");
    // Homeroom teachers may only load the roster for their own class.
    if (req.user!.role === Role.TEACHER) {
      await assertTeacherOwnsClass(req.user!.sub, classId);
    }
    const date = dateOnly(req.query.date ? new Date(req.query.date as string) : undefined);
    const students = await prisma.student.findMany({
      where: { classId },
      orderBy: { firstName: "asc" },
      include: {
        attendance: { where: { date }, include: { alert: true } },
      },
    });
    res.json({ date: date.toISOString(), students });
  }),
);

// Per-class attendance summary for a given day (admin/head overview).
// One card per class: total students, present and absent counts.
attendanceRouter.get(
  "/summary",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (req, res) => {
    const date = dateOnly(req.query.date ? new Date(req.query.date as string) : undefined);
    const [classes, records] = await Promise.all([
      prisma.class.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { students: true } } },
      }),
      prisma.attendance.findMany({
        where: { date },
        select: { status: true, student: { select: { classId: true } } },
      }),
    ]);

    // Tally present/absent/late per class for the day.
    const tally = new Map<string, { present: number; absent: number; late: number }>();
    for (const r of records) {
      const classId = r.student.classId;
      if (!classId) continue;
      const entry = tally.get(classId) ?? { present: 0, absent: 0, late: 0 };
      if (r.status === AttendanceStatus.PRESENT) entry.present++;
      else if (r.status === AttendanceStatus.ABSENT) entry.absent++;
      else if (r.status === AttendanceStatus.LATE) entry.late++;
      tally.set(classId, entry);
    }

    const summary = classes.map((c) => {
      const t = tally.get(c.id) ?? { present: 0, absent: 0, late: 0 };
      return {
        id: c.id,
        name: c.name,
        level: c.level,
        homeroomTeacherId: c.homeroomTeacherId,
        total: c._count.students,
        present: t.present,
        absent: t.absent,
        late: t.late,
      };
    });

    res.json({ date: date.toISOString(), classes: summary });
  }),
);

// Attendance history for a student (parent scoped to own children)
attendanceRouter.get(
  "/",
  authGuard(),
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId as string;
    if (!studentId) throw new AppError(400, "studentId is required");
    if (req.user!.role === Role.PARENT) {
      await assertParentOwnsStudent(req.user!.sub, studentId);
    }
    const records = await prisma.attendance.findMany({
      where: { studentId },
      include: { alert: true },
      orderBy: { date: "desc" },
      take: 60,
    });
    res.json({ records });
  }),
);

// Mark one student — only staff (teachers) may mark attendance, not admins.
attendanceRouter.post(
  "/",
  authGuard([Role.TEACHER]),
  validate(markAttendanceSchema),
  asyncHandler(async (req, res) => {
    const { studentId, status } = req.body;
    // A teacher may only mark students in their own homeroom class.
    await assertTeacherOwnsStudent(req.user!.sub, studentId);
    const date = dateOnly(req.body.date);
    const record = await prisma.attendance.upsert({
      where: { studentId_date: { studentId, date } },
      create: { studentId, date, status, markedById: req.user!.sub },
      update: { status, markedById: req.user!.sub },
      include: { alert: true },
    });
    res.json({ record });
  }),
);

// Mark a whole class at once — staff (teachers) only.
attendanceRouter.post(
  "/bulk",
  authGuard([Role.TEACHER]),
  validate(bulkAttendanceSchema),
  asyncHandler(async (req, res) => {
    const date = dateOnly(req.body.date);
    const markedById = req.user!.sub;
    // Every student in the batch must belong to the teacher's own class.
    await Promise.all(
      req.body.entries.map((e: { studentId: string }) =>
        assertTeacherOwnsStudent(markedById, e.studentId),
      ),
    );
    const records = await prisma.$transaction(
      req.body.entries.map((e: { studentId: string; status: AttendanceStatus }) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: e.studentId, date } },
          create: { studentId: e.studentId, date, status: e.status, markedById },
          update: { status: e.status, markedById },
        }),
      ),
    );
    res.json({ count: records.length });
  }),
);

// Raise an absence alert to the student's parents — staff (teachers) only,
// since it follows on from marking a student absent.
attendanceRouter.post(
  "/:id/alert",
  authGuard([Role.TEACHER]),
  validate(raiseAlertSchema),
  asyncHandler(async (req, res) => {
    const attendance = await prisma.attendance.findUnique({
      where: { id: req.params.id },
      include: { student: true, alert: true },
    });
    if (!attendance) throw new AppError(404, "Attendance record not found");
    // Only the student's own homeroom teacher may raise the alert.
    await assertTeacherOwnsStudent(req.user!.sub, attendance.studentId);
    if (attendance.status !== AttendanceStatus.ABSENT) {
      throw new AppError(400, "Alerts can only be raised for absent students");
    }
    if (attendance.alert) throw new AppError(409, "An alert has already been raised");

    const alert = await prisma.absenceAlert.create({
      data: { attendanceId: attendance.id, message: req.body.message },
    });

    // Notify every guardian of the student
    const guardians = await guardianUserIds(attendance.studentId);
    const student = attendance.student;
    await Promise.all(
      guardians.map((userId) =>
        notify({
          userId,
          type: "ABSENCE_ALERT",
          title: `${student.firstName} is marked absent`,
          body: req.body.message,
          data: { alertId: alert.id, studentId: student.id },
        }),
      ),
    );
    guardians.forEach((userId) =>
      emitTo(userId, SocketEvents.ABSENCE_ALERT, {
        alertId: alert.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
      }),
    );

    res.status(201).json({ alert });
  }),
);
