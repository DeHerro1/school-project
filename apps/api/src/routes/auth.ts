import { Router } from "express";
import argon2 from "argon2";
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  Role,
} from "@repo/shared";
import { prisma } from "../lib/prisma";
import { validate } from "../middleware/validate";
import { authGuard } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/error";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshExpiryDate,
} from "../lib/jwt";

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

async function issueTokens(user: { id: string; role: string; name: string }) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role as Role,
    name: user.name,
  });
  const refreshToken = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: refreshExpiryDate() },
  });
  return { accessToken, refreshToken };
}

// Public self-registration is limited to parents (staff are created by admins).
authRouter.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, phone } = req.body;
    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, phone, role: Role.PARENT },
    });
    const tokens = await issueTokens(user);
    res.status(201).json({ user: publicUser(user), ...tokens });
  }),
);

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    const user = await prisma.user.findUnique({
      where: email ? { email } : { username },
    });
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new AppError(401, "Invalid credentials");
    }
    const tokens = await issueTokens(user);
    res.json({ user: publicUser(user), ...tokens });
  }),
);

authRouter.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(401, "Session expired, please log in again");
    }
    let userId: string;
    try {
      userId = verifyRefreshToken(refreshToken).sub;
    } catch {
      throw new AppError(401, "Invalid refresh token");
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(401, "User no longer exists");

    // rotate: delete the old token, issue a fresh pair
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const tokens = await issueTokens(user);
    res.json({ user: publicUser(user), ...tokens });
  }),
);

authRouter.post(
  "/logout",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    await prisma.refreshToken.deleteMany({ where: { token: req.body.refreshToken } });
    res.status(204).end();
  }),
);

authRouter.get(
  "/me",
  authGuard(),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AppError(404, "User not found");
    res.json({ user: publicUser(user) });
  }),
);
