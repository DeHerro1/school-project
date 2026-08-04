import { Router } from "express";
import {
  createClassSchema,
  updateClassSchema,
  updateClassStaffSchema,
  Role,
} from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler, AppError } from "../middleware/error";

export const classesRouter = Router();

classesRouter.get(
  "/",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (_req, res) => {
    const classes = await prisma.class.findMany({
      include: {
        homeroomTeacher: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ classes });
  }),
);

classesRouter.get(
  "/:id",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (req, res) => {
    const klass = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: {
        homeroomTeacher: { select: { id: true, name: true } },
        students: { orderBy: { firstName: "asc" } },
      },
    });
    if (!klass) throw new AppError(404, "Class not found");
    res.json({ class: klass });
  }),
);

classesRouter.post(
  "/",
  authGuard([Role.ADMIN]),
  validate(createClassSchema),
  asyncHandler(async (req, res) => {
    const klass = await prisma.class.create({ data: req.body });
    res.status(201).json({ class: klass });
  }),
);

// Admins may edit any field; staff (teachers) may only update the declared
// student count and the subjects offered. The role is used to pick the schema,
// so a teacher can never change the name, level or homeroom teacher.
classesRouter.patch(
  "/:id",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (req, res) => {
    const schema =
      req.user!.role === Role.ADMIN ? updateClassSchema : updateClassStaffSchema;
    const data = schema.parse(req.body);
    const klass = await prisma.class.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ class: klass });
  }),
);

classesRouter.delete(
  "/:id",
  authGuard([Role.ADMIN]),
  asyncHandler(async (req, res) => {
    await prisma.class.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
