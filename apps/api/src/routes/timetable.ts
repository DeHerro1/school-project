import { Router } from "express";
import { createTimetableSlotSchema, updateTimetableSlotSchema, Role } from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler, AppError } from "../middleware/error";
import { parentStudentIds, assertParentOwnsStudent, teacherClassIds } from "../services/access";

export const timetableRouter = Router();

type SlotWhere = NonNullable<Parameters<typeof prisma.timetable.findMany>[0]>["where"];

// Shared slot query so every access path returns the same shape/order.
const findSlots = (where?: SlotWhere) =>
  prisma.timetable.findMany({
    where,
    include: {
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
    },
    orderBy: [{ day: "asc" }, { period: "asc" }],
  });

// Timetable for a class. Parents may view their child's class timetable.
timetableRouter.get(
  "/",
  authGuard(),
  asyncHandler(async (req, res) => {
    const classId = req.query.classId as string | undefined;
    const studentId = req.query.studentId as string | undefined;

    let resolvedClassId = classId;
    if (studentId) {
      if (req.user!.role === Role.PARENT) {
        await assertParentOwnsStudent(req.user!.sub, studentId);
      }
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { classId: true },
      });
      resolvedClassId = student?.classId ?? undefined;
    }

    // Staff (teachers) may only view the timetable of their own homeroom
    // class — never another class's, and never the whole school's.
    if (req.user!.role === Role.TEACHER) {
      const ownClassIds = await teacherClassIds(req.user!.sub);
      if (resolvedClassId) {
        if (!ownClassIds.includes(resolvedClassId)) {
          throw new AppError(403, "You can only view the timetable for your own class");
        }
      } else if (ownClassIds.length === 0) {
        return res.json({ slots: [] });
      } else {
        // No class specified: scope to the classes they own.
        return res.json({ slots: await findSlots({ classId: { in: ownClassIds } }) });
      }
    }

    if (req.user!.role === Role.PARENT && !studentId) {
      // parents must scope to one of their children
      const ids = await parentStudentIds(req.user!.sub);
      if (ids.length === 0) return res.json({ slots: [] });
    }

    const slots = await findSlots(resolvedClassId ? { classId: resolvedClassId } : undefined);
    res.json({ slots });
  }),
);

// Both admins and staff (teachers) may build the timetable. A teacher can only
// add slots for themselves — they see and manage what they're assigned to.
timetableRouter.post(
  "/",
  authGuard([Role.ADMIN, Role.TEACHER]),
  validate(createTimetableSlotSchema),
  asyncHandler(async (req, res) => {
    // Staff may add slots for themselves or teacher-less activity slots
    // (Lunch, Worship, …); they can't assign a slot to another teacher.
    if (
      req.user!.role === Role.TEACHER &&
      req.body.teacherId &&
      req.body.teacherId !== req.user!.sub
    ) {
      throw new AppError(403, "Staff can only add timetable slots for themselves");
    }

    // …and only to their own homeroom class.
    if (req.user!.role === Role.TEACHER) {
      const ownClassIds = await teacherClassIds(req.user!.sub);
      if (!ownClassIds.includes(req.body.classId)) {
        throw new AppError(403, "You can only edit the timetable for your own class");
      }
    }

    const { repeat, ...data } = req.body;

    // Recurring: place the slot on every school day for the term. Days that
    // already have a slot at this time are skipped rather than erroring.
    if (repeat) {
      const weekdays = ["MON", "TUE", "WED", "THU", "FRI"] as const;
      const { count } = await prisma.timetable.createMany({
        data: weekdays.map((day) => ({ ...data, day })),
        skipDuplicates: true,
      });
      return res.status(201).json({ count });
    }

    try {
      const slot = await prisma.timetable.create({ data });
      res.status(201).json({ slot });
    } catch (e) {
      if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
        throw new AppError(409, "A slot already exists at that time on that day.");
      }
      throw e;
    }
  }),
);

// Edit a slot in place. Same permissions as adding: admins may edit any slot,
// teachers only their own (and can't hand it to another teacher).
timetableRouter.patch(
  "/:id",
  authGuard([Role.ADMIN, Role.TEACHER]),
  validate(updateTimetableSlotSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.timetable.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, "Timetable slot not found");

    if (req.user!.role === Role.TEACHER) {
      if (existing.teacherId !== req.user!.sub) {
        throw new AppError(403, "Staff can only edit their own timetable slots");
      }
      if (req.body.teacherId && req.body.teacherId !== req.user!.sub) {
        throw new AppError(403, "Staff can only assign timetable slots to themselves");
      }
    }

    try {
      const slot = await prisma.timetable.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ slot });
    } catch (e) {
      if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
        throw new AppError(409, "A slot already exists at that time on that day.");
      }
      throw e;
    }
  }),
);

timetableRouter.delete(
  "/:id",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (req, res) => {
    // Teachers may only remove their own slots; admins may remove any.
    if (req.user!.role === Role.TEACHER) {
      const slot = await prisma.timetable.findUnique({ where: { id: req.params.id } });
      if (!slot) throw new AppError(404, "Timetable slot not found");
      if (slot.teacherId !== req.user!.sub) {
        throw new AppError(403, "Staff can only remove their own timetable slots");
      }
    }
    await prisma.timetable.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
