import { Router } from "express";
import {
  createStudentSchema,
  updateStudentSchema,
  linkGuardianSchema,
  Role,
} from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler, AppError } from "../middleware/error";
import { uploadImage, publicFileUrl } from "../lib/upload";
import { assertParentOwnsStudent, assertTeacherOwnsClass, guardianUserIds } from "../services/access";
import { notify } from "../lib/socket";

export const studentsRouter = Router();

/** Generate a unique admission number (e.g. ADM-2026-4821). */
async function generateAdmissionNo(): Promise<string> {
  const year = new Date().getFullYear();
  for (let i = 0; i < 5; i++) {
    const candidate = `ADM-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await prisma.student.findUnique({ where: { admissionNo: candidate } });
    if (!exists) return candidate;
  }
  return `ADM-${year}-${Date.now()}`;
}

// Parent: list my children (with class + today's presence handled client-side)
studentsRouter.get(
  "/mine",
  authGuard([Role.PARENT]),
  asyncHandler(async (req, res) => {
    const students = await prisma.student.findMany({
      where: { guardianships: { some: { parentUserId: req.user!.sub } } },
      include: { class: { select: { id: true, name: true, level: true } } },
      orderBy: { firstName: "asc" },
    });
    res.json({ students });
  }),
);

// Admin/teacher: list all students (optionally by class)
studentsRouter.get(
  "/",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (req, res) => {
    const classId = req.query.classId as string | undefined;
    const students = await prisma.student.findMany({
      where: classId ? { classId } : undefined,
      include: {
        class: { select: { id: true, name: true } },
        guardianships: {
          include: { parent: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { firstName: "asc" },
    });
    res.json({ students });
  }),
);

studentsRouter.get(
  "/:id",
  authGuard(),
  asyncHandler(async (req, res) => {
    if (req.user!.role === Role.PARENT) {
      await assertParentOwnsStudent(req.user!.sub, req.params.id);
    }
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        class: true,
        guardianships: {
          include: { parent: { select: { id: true, name: true, email: true, phone: true } } },
        },
      },
    });
    if (!student) throw new AppError(404, "Student not found");
    res.json({ student });
  }),
);

studentsRouter.post(
  "/",
  authGuard([Role.ADMIN, Role.TEACHER]),
  validate(createStudentSchema),
  asyncHandler(async (req, res) => {
    const data = { ...req.body };
    // A homeroom teacher may only enrol students into their own class.
    if (req.user!.role === Role.TEACHER) {
      if (!data.classId) throw new AppError(400, "A class is required");
      await assertTeacherOwnsClass(req.user!.sub, data.classId);
    }
    if (!data.admissionNo) data.admissionNo = await generateAdmissionNo();
    const student = await prisma.student.create({ data });
    res.status(201).json({ student });
  }),
);

studentsRouter.patch(
  "/:id",
  authGuard([Role.ADMIN]),
  validate(updateStudentSchema),
  asyncHandler(async (req, res) => {
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ student });
  }),
);

studentsRouter.delete(
  "/:id",
  authGuard([Role.ADMIN]),
  asyncHandler(async (req, res) => {
    await prisma.student.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

// Upload / replace a student's profile photo
studentsRouter.post(
  "/:id/photo",
  authGuard([Role.ADMIN, Role.TEACHER]),
  uploadImage.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, "No image uploaded");
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: { photoUrl: publicFileUrl(req.file.filename) },
    });
    res.json({ student });
  }),
);

// Share a student's profile with their parents via the parent portal.
studentsRouter.post(
  "/:id/share-profile",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (req, res) => {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { class: { select: { name: true } } },
    });
    if (!student) throw new AppError(404, "Student not found");
    const guardians = await guardianUserIds(student.id);
    await Promise.all(
      guardians.map((userId) =>
        notify({
          userId,
          type: "PROFILE_SHARED",
          title: `${student.firstName} ${student.lastName}'s profile`,
          body: `Admission No ${student.admissionNo} · ${student.class?.name ?? "No class"}`,
          data: { studentId: student.id },
        }),
      ),
    );
    res.json({ shared: guardians.length });
  }),
);

// Link a parent as guardian of a student
studentsRouter.post(
  "/guardianships",
  authGuard([Role.ADMIN]),
  validate(linkGuardianSchema),
  asyncHandler(async (req, res) => {
    const { parentUserId, studentId, relation } = req.body;
    const parent = await prisma.user.findUnique({ where: { id: parentUserId } });
    if (!parent || parent.role !== Role.PARENT) {
      throw new AppError(400, "Selected user is not a parent account");
    }
    const link = await prisma.guardianship.create({
      data: { parentUserId, studentId, relation },
    });
    res.status(201).json({ guardianship: link });
  }),
);

studentsRouter.delete(
  "/guardianships/:id",
  authGuard([Role.ADMIN]),
  asyncHandler(async (req, res) => {
    await prisma.guardianship.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
