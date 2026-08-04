import { Router } from "express";
import { createProgressReportSchema, Role, SocketEvents } from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler, AppError } from "../middleware/error";
import { assertParentOwnsStudent, guardianUserIds } from "../services/access";
import { notify, emitTo } from "../lib/socket";

export const progressRouter = Router();

// Progress / talent guidance for a student (parents scoped)
progressRouter.get(
  "/",
  authGuard(),
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId as string;
    if (!studentId) throw new AppError(400, "studentId is required");
    if (req.user!.role === Role.PARENT) {
      await assertParentOwnsStudent(req.user!.sub, studentId);
    }
    const reports = await prisma.progressReport.findMany({
      where: { studentId },
      include: { teacher: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ reports });
  }),
);

// Teacher writes a talent / guidance report. Notifies parents.
progressRouter.post(
  "/",
  authGuard([Role.ADMIN, Role.TEACHER]),
  validate(createProgressReportSchema),
  asyncHandler(async (req, res) => {
    const { studentId, term, strengths, talents, needs, howParentsCanHelp } = req.body;
    const report = await prisma.progressReport.create({
      data: {
        studentId,
        teacherId: req.user!.sub,
        term,
        strengths,
        talents,
        needs,
        howParentsCanHelp,
      },
    });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { firstName: true },
    });
    const guardians = await guardianUserIds(studentId);
    await Promise.all(
      guardians.map((userId) =>
        notify({
          userId,
          type: "PROGRESS_PUBLISHED",
          title: `New progress & talent update for ${student?.firstName ?? "your child"}`,
          body: talents,
          data: { studentId, progressId: report.id },
        }),
      ),
    );
    guardians.forEach((userId) =>
      emitTo(userId, SocketEvents.PROGRESS_PUBLISHED, { studentId, progressId: report.id }),
    );

    res.status(201).json({ report });
  }),
);

// Re-share an existing progress update to the parent portal.
progressRouter.post(
  "/:id/share",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (req, res) => {
    const report = await prisma.progressReport.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, firstName: true } } },
    });
    if (!report) throw new AppError(404, "Progress update not found");
    const guardians = await guardianUserIds(report.studentId);
    await Promise.all(
      guardians.map((userId) =>
        notify({
          userId,
          type: "PROGRESS_SHARED",
          title: `New progress & talent update for ${report.student?.firstName ?? "your child"}`,
          body: report.talents || "Your class teacher has shared a progress update with you.",
          data: { studentId: report.studentId, progressId: report.id },
        }),
      ),
    );
    guardians.forEach((userId) =>
      emitTo(userId, SocketEvents.PROGRESS_PUBLISHED, { studentId: report.studentId, progressId: report.id }),
    );
    res.json({ shared: guardians.length });
  }),
);
