import { randomUUID } from "node:crypto";
import type { H3Event } from "h3";
import { saveLocalFile } from "./localStorage";

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const docTypes = [...imageTypes, "application/pdf"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB, matches the old MAX_UPLOAD_MB default

function pickFile(
  parts: Awaited<ReturnType<typeof readMultipartFormData>>,
  allowedTypes: string[],
  label: string,
) {
  const file = parts?.find((p) => p.name === "file" && p.filename);
  if (!file) throw httpError(400, `No ${label} uploaded`);
  const type = file.type ?? "application/octet-stream";
  if (!allowedTypes.includes(type)) throw httpError(415, `Unsupported file type: ${type}`);
  if (file.data.length > MAX_UPLOAD_BYTES) throw httpError(413, "File is too large");
  return file;
}

/** Read a single `file` field from a multipart/form-data request body. */
export async function readUploadedImage(event: H3Event) {
  const parts = await readMultipartFormData(event);
  return pickFile(parts, imageTypes, "image");
}

/** Like readUploadedImage(), but also accepts application/pdf (report attachments). */
export async function readUploadedDocument(event: H3Event) {
  const parts = await readMultipartFormData(event);
  return pickFile(parts, docTypes, "file");
}

/**
 * An image upload alongside plain-text fields in the same multipart body
 * (e.g. a photo share's studentId/caption) — readUploadedImage() only
 * returns the file part, so routes that also need sibling fields read the
 * whole form once through this instead.
 */
export async function readUploadedImageWithFields(event: H3Event, fieldNames: string[]) {
  const parts = await readMultipartFormData(event);
  const file = pickFile(parts, imageTypes, "image");
  const fields: Record<string, string> = {};
  for (const name of fieldNames) {
    const part = parts?.find((p) => p.name === name && !p.filename);
    if (part) fields[name] = part.data.toString("utf-8");
  }
  return { file, fields };
}

/**
 * Store a buffered file and return its public URL — the Firestore/Storage
 * equivalent of apps/api/src/lib/upload.ts's `storageUrl()`. Public/
 * unauthenticated either way (see storage.rules), same parity note as
 * before: student photos were already served unauthenticated.
 *
 * Real Firebase Storage when USE_REAL_FIREBASE (see firebase.ts); otherwise
 * local disk (server/utils/localStorage.ts + server/routes/uploads/**),
 * keeping local dev Node-only.
 */
export async function storageUrl(file: { data: Buffer; filename?: string; type?: string }): Promise<string> {
  if (!USE_REAL_FIREBASE) return saveLocalFile(file.data, file.filename);

  const ext = file.filename?.includes(".") ? file.filename.slice(file.filename.lastIndexOf(".")) : "";
  const path = `uploads/${Date.now()}-${randomUUID()}${ext}`;
  const bucket = adminBucket();
  await bucket.file(path).save(file.data, { contentType: file.type ?? "application/octet-stream" });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media`;
}
