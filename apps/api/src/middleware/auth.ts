import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@repo/shared";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { AppError } from "./error";

export interface AccessPayload {
  sub: string; // user id (Supabase auth.users.id, mirrored as Prisma User.id)
  role: Role;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessPayload;
    }
  }
}

/**
 * Verify a Supabase-issued access token locally (HS256, via the project's
 * JWT secret) — no network call to Supabase per request. `role`/`name`
 * aren't reliably in the Supabase token itself, so once the signature/`sub`
 * are verified we look up the Prisma `User` profile to get them.
 */
export function authGuard(roles?: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(new AppError(401, "Authentication required"));
    }
    (async () => {
      let sub: string;
      try {
        const payload = jwt.verify(header.slice(7), env.supabase.jwtSecret) as { sub?: string };
        if (!payload.sub) throw new Error("missing sub");
        sub = payload.sub;
      } catch {
        return next(new AppError(401, "Invalid or expired token"));
      }
      const user = await prisma.user.findUnique({ where: { id: sub } });
      if (!user) {
        // Supabase Auth user exists but no matching profile row — a real
        // desync case (e.g. profile deleted separately), not a crash.
        return next(new AppError(401, "User profile not found"));
      }
      req.user = { sub: user.id, role: user.role, name: user.name };
      if (roles && roles.length && !roles.includes(user.role)) {
        return next(new AppError(403, "You do not have access to this resource"));
      }
      next();
    })().catch(next);
  };
}
