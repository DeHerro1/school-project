import jwt from "jsonwebtoken";
import type { Role } from "@repo/shared";
import { env } from "./env";

export interface AccessPayload {
  sub: string; // user id
  role: Role;
  name: string;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwt.refreshSecret) as { sub: string };
}

/** ms until the refresh token expires, for DB persistence. */
export function refreshExpiryDate(): Date {
  // parse simple "7d"/"15m" style; default 7 days
  const ttl = env.jwt.refreshTtl;
  const m = /^(\d+)([smhd])$/.exec(ttl);
  const now = Date.now();
  if (!m) return new Date(now + 7 * 24 * 3600 * 1000);
  const n = Number(m[1]);
  const unit = m[2];
  const mult = unit === "s" ? 1e3 : unit === "m" ? 6e4 : unit === "h" ? 36e5 : 864e5;
  return new Date(now + n * mult);
}
