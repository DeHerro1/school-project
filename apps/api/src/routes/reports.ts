import { Router } from "express";
import { createTermReportSchema, Role, SocketEvents } from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler, AppError } from "../middleware/error";
import { uploadDoc, publicFileUrl } from "../lib/upload";
import { assertParentOwnsStudent, guardianUserIds } from "../services/access";
import { notify, emitTo } from "../lib/socket";

export const reportsRouter = Router();

// List term reports for a student (parents scoped)
reportsRouter.get(
  "/",
  authGuard(),
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId as string;
    if (!studentId) throw new AppError(400, "studentId is required");
    if (req.user!.role === Role.PARENT) {
      await assertParentOwnsStudent(req.user!.sub, studentId);
    }
    const reports = await prisma.termReport.findMany({
      where: { studentId },
      include: {
        marks: { include: { subject: { select: { name: true } } } },
        class: { select: { id: true, name: true, level: true } },
        promotedToClass: { select: { id: true, name: true, level: true } },
      },
      orderBy: [{ year: "desc" }, { term: "desc" }],
    });
    res.json({ reports });
  }),
);

// Create a term report with structured marks (JSON). Notifies parents.
reportsRouter.post(
  "/",
  authGuard([Role.ADMIN, Role.TEACHER]),
  validate(createTermReportSchema),
  asyncHandler(async (req, res) => {
    const {
      studentId,
      term,
      year,
      marks,
      promotedToClassId,
      reopenDate,
      positionInClass,
      progress,
      interest,
      strength,
      howParentsCanHelp,
    } = req.body;
    // Record the class the student is currently in, so reports can be grouped by it.
    const current = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });
    const report = await prisma.termReport.create({
      data: {
        studentId,
        term,
        year,
        classId: current?.classId ?? null,
        promotedToClassId: promotedToClassId ?? null,
        reopenDate: reopenDate ?? null,
        positionInClass: positionInClass ?? null,
        progress: progress ?? null,
        interest: interest ?? null,
        strength: strength ?? null,
        howParentsCanHelp: howParentsCanHelp ?? null,
        marks: marks?.length ? { create: marks } : undefined,
      },
      include: { marks: true },
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
          type: "REPORT_PUBLISHED",
          title: `${term} ${year} report for ${student?.firstName ?? "your child"} is ready`,
          data: { studentId, reportId: report.id },
        }),
      ),
    );
    guardians.forEach((userId) =>
      emitTo(userId, SocketEvents.REPORT_PUBLISHED, { studentId, reportId: report.id }),
    );

    res.status(201).json({ report });
  }),
);

// Re-share an existing report to the parent portal (WhatsApp is composed client-side).
reportsRouter.post(
  "/:id/share",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (req, res) => {
    const report = await prisma.termReport.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, firstName: true } } },
    });
    if (!report) throw new AppError(404, "Report not found");
    const guardians = await guardianUserIds(report.studentId);
    await Promise.all(
      guardians.map((userId) =>
        notify({
          userId,
          type: "REPORT_SHARED",
          title: `${report.term} ${report.year} report for ${report.student?.firstName ?? "your child"} is ready`,
          body: "Your class teacher has shared a term report with you.",
          data: { studentId: report.studentId, reportId: report.id },
        }),
      ),
    );
    guardians.forEach((userId) =>
      emitTo(userId, SocketEvents.REPORT_PUBLISHED, { studentId: report.studentId, reportId: report.id }),
    );
    res.json({ shared: guardians.length });
  }),
);

// Attach / replace the report PDF
reportsRouter.post(
  "/:id/file",
  authGuard([Role.ADMIN, Role.TEACHER]),
  uploadDoc.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, "No file uploaded");
    const report = await prisma.termReport.update({
      where: { id: req.params.id },
      data: { fileUrl: publicFileUrl(req.file.filename) },
    });
    res.json({ report });
  }),
);
