// Local-disk stand-in for Firebase Storage, used for dev instead of the
// Storage emulator (keeping the whole local setup Node-only). Files are
// written under apps/school/.data/uploads and served back by
// server/routes/uploads/[...path].get.ts. Swapped for the real bucket
// (see storage.ts) once GOOGLE_APPLICATION_CREDENTIALS points at a real
// Firebase project.
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = resolve(__dirname, "../../.data/uploads");

export function saveLocalFile(data: Buffer, filename: string | undefined): string {
  const ext = filename?.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  const name = `${Date.now()}-${randomUUID()}${ext}`;
  mkdirSync(UPLOADS_DIR, { recursive: true });
  writeFileSync(resolve(UPLOADS_DIR, name), data);
  return `/uploads/${name}`;
}
