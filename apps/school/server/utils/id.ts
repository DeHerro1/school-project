import { randomUUID } from "node:crypto";

/**
 * Generate a document id shaped like a Prisma `cuid()` — starts with "c",
 * no spaces/hyphens — because `@repo/shared`'s Zod schemas (still shared
 * with the Prisma-backed apps/api) validate class/subject/student/invoice
 * ids with `.cuid()`. Used instead of Firestore/the mock's own auto-id
 * (real Firestore ids and the mock's random-hex ids don't start with "c"),
 * for both the mock and a real Firestore project alike.
 */
export function newId(): string {
  return `c${randomUUID().replace(/-/g, "")}`;
}
