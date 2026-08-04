import { Router } from "express";
import { createSubjectSchema, Role } from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";

export const subjectsRouter = Router();

subjectsRouter.get(
  "/",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (_req, res) => {
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    res.json({ subjects });
  }),
);

subjectsRouter.post(
  "/",
  authGuard([Role.ADMIN]),
  validate(createSubjectSchema),
  asyncHandler(async (req, res) => {
    const subject = await prisma.subject.create({ data: req.body });
    res.status(201).json({ subject });
  }),
);

subjectsRouter.patch(
  "/:id",
  authGuard([Role.ADMIN]),
  validate(createSubjectSchema.partial()),
  asyncHandler(async (req, res) => {
    const subject = await prisma.subject.update({ where: { id: req.params.id }, data: req.body });
    res.json({ subject });
  }),
);

subjectsRouter.delete(
  "/:id",
  authGuard([Role.ADMIN]),
  asyncHandler(async (req, res) => {
    await prisma.subject.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
