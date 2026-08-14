import { Router } from "express";
import { createUserSchema, updateUserSchema, Role } from "@repo/shared";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase";
import { provisionUser } from "../lib/provisionUser";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler, AppError } from "../middleware/error";
import { uploadImage, storageUrl } from "../lib/upload";

export const usersRouter = Router();

const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  role: true,
  phone: true,
  avatarUrl: true,
  createdAt: true,
} as const;

// List users, optionally filtered by role (?role=TEACHER)
usersRouter.get(
  "/",
  authGuard([Role.ADMIN]),
  asyncHandler(async (req, res) => {
    const role = req.query.role as Role | undefined;
    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  }),
);

// Admin creates staff or parent accounts
usersRouter.post(
  "/",
  authGuard([Role.ADMIN]),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, phone, role, username } = req.body;
    const created = await provisionUser({ email, password, name, phone, role, username });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: created.id },
      select: userSelect,
    });
    res.status(201).json({ user });
  }),
);

usersRouter.get(
  "/:id",
  authGuard([Role.ADMIN]),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: userSelect,
    });
    if (!user) throw new AppError(404, "User not found");
    res.json({ user });
  }),
);

usersRouter.patch(
  "/:id",
  authGuard([Role.ADMIN]),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { name, phone, password } = req.body;
    if (password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { password });
      if (error) throw new AppError(400, error.message);
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, phone },
      select: userSelect,
    });
    res.json({ user });
  }),
);

// Upload / replace a user's profile photo (staff, parents, admins)
usersRouter.post(
  "/:id/avatar",
  authGuard([Role.ADMIN]),
  uploadImage.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, "No image uploaded");
    const avatarUrl = await storageUrl(req.file);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { avatarUrl },
      select: userSelect,
    });
    res.json({ user });
  }),
);

usersRouter.delete(
  "/:id",
  authGuard([Role.ADMIN]),
  asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { id: req.params.id } });
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (error) {
      console.error(`Failed to delete Supabase Auth user ${req.params.id} after Prisma delete`, error);
    }
    res.status(204).end();
  }),
);
