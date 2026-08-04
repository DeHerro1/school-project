import type { NextFunction, Request, Response } from "express";
import type { Role } from "@repo/shared";
import { verifyAccessToken, type AccessPayload } from "../lib/jwt";
import { AppError } from "./error";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessPayload;
    }
  }
}

/**
 * Verify the bearer token and (optionally) enforce that the user has one of
 * the allowed roles. Attaches req.user for downstream handlers.
 */
export function authGuard(roles?: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(new AppError(401, "Authentication required"));
    }
    try {
      const payload = verifyAccessToken(header.slice(7));
      req.user = payload;
      if (roles && roles.length && !roles.includes(payload.role)) {
        return next(new AppError(403, "You do not have access to this resource"));
      }
      next();
    } catch {
      next(new AppError(401, "Invalid or expired token"));
    }
  };
}
