import { existsSync, readFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { UPLOADS_DIR } from "../../utils/localStorage";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

// Serves files written by server/utils/localStorage.ts (dev-only stand-in
// for Firebase Storage's public download URLs). `basename()` collapses any
// `..`/slashes in the param so this can only ever read inside UPLOADS_DIR.
export default defineEventHandler((event) => {
  const raw = getRouterParam(event, "path") ?? "";
  const file = basename(raw);
  const path = resolve(UPLOADS_DIR, file);
  if (!path.startsWith(UPLOADS_DIR) || !existsSync(path)) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
  setHeader(event, "Content-Type", CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream");
  setHeader(event, "Cache-Control", "public, max-age=31536000, immutable");
  return readFileSync(path);
});
