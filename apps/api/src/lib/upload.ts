import multer from "multer";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { env } from "./env";
import { supabaseAdmin } from "./supabase";

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const docTypes = ["application/pdf", ...imageTypes];

function fileFilterFor(allowed: string[]) {
  return (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  };
}

const limits = { fileSize: env.maxUploadMb * 1024 * 1024 };
// Buffer in memory (small files, capped by `limits` above) instead of disk —
// the buffer is pushed straight to Supabase Storage in `storageUrl()`.
const storage = multer.memoryStorage();

/** Photos (student pictures, avatars). Images only. */
export const uploadImage = multer({ storage, limits, fileFilter: fileFilterFor(imageTypes) });

/** Report files — PDF or image. */
export const uploadDoc = multer({ storage, limits, fileFilter: fileFilterFor(docTypes) });

/**
 * Create the storage bucket if it doesn't exist yet. Called once at server
 * startup — safe to call repeatedly (idempotent).
 *
 * The bucket is public: student photos and media-share images were already
 * served unauthenticated at the old `/files/*` static route, so this is
 * parity, not a new exposure. Report PDFs go through the same bucket for
 * simplicity — revisit with per-object signed URLs if that sensitivity
 * level becomes a concern later.
 */
export async function ensureStorageBucket() {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw listError;
  if (buckets?.some((b) => b.name === env.supabase.storageBucket)) return;
  const { error } = await supabaseAdmin.storage.createBucket(env.supabase.storageBucket, {
    public: true,
    fileSizeLimit: `${env.maxUploadMb}MB`,
  });
  if (error) throw error;
}

/** Upload a multer memory-buffered file to Storage and return its public URL. */
export async function storageUrl(file: Express.Multer.File): Promise<string> {
  const path = `${Date.now()}-${randomUUID()}${extname(file.originalname)}`;
  const { error } = await supabaseAdmin.storage
    .from(env.supabase.storageBucket)
    .upload(path, file.buffer, { contentType: file.mimetype });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(env.supabase.storageBucket).getPublicUrl(path);
  return data.publicUrl;
}
