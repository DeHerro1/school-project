import { Router } from "express";
import { loginSchema, registerSchema, Role } from "@repo/shared";
import { prisma } from "../lib/prisma";
import { supabaseAnon } from "../lib/supabase";
import { provisionUser } from "../lib/provisionUser";
import { validate } from "../middleware/validate";
import { authGuard } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/error";

export const authRouter = Router();

function publicUser(u: {
  id: string;
  email: string;
  username: string | null;
  name: string;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
}) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    name: u.name,
    role: u.role,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
  };
}

// Public self-registration is limited to parents (staff are created by admins).
authRouter.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, phone } = req.body;
    const user = await provisionUser({ email, password, name, phone, role: Role.PARENT });
    res.status(201).json({ user: publicUser(user) });
  }),
);

// Thin proxy to Supabase Auth: username sign-in resolves to an email first
// (Supabase's password grant only accepts email/phone), then the Prisma
// profile is returned alongside Supabase's session.
authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    let loginEmail = email as string | undefined;
    if (!loginEmail && username) {
      const byUsername = await prisma.user.findUnique({ where: { username } });
      if (!byUsername) throw new AppError(401, "Invalid credentials");
      loginEmail = byUsername.email;
    }
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: loginEmail!,
      password,
    });
    if (error || !data.session) {
      throw new AppError(401, "Invalid credentials");
    }
    const user = await prisma.user.findUnique({ where: { id: data.user.id } });
    if (!user) throw new AppError(401, "User profile not found");
    res.json({
      user: publicUser(user),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    });
  }),
);

// Session refresh/logout are handled client-side by the Supabase SDK (which
// auto-refreshes and persists its own session) — no server round trip needed.

authRouter.get(
  "/me",
  authGuard(),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AppError(404, "User not found");
    res.json({ user: publicUser(user) });
  }),
);
