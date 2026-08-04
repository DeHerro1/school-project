import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { env } from "./env";

const __dirname = dirname(fileURLToPath(import.meta.url));
// uploads dir lives at apps/api/<UPLOAD_DIR>
export const uploadRoot = resolve(__dirname, "../../", env.uploadDir);

if (!existsSync(uploadRoot)) mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${randomUUID()}${extname(file.originalname)}`);
  },
});

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

/** Photos (student pictures, avatars). Images only. */
export const uploadImage = multer({
  storage,
  limits,
  fileFilter: fileFilterFor(imageTypes),
});

/** Report files — PDF or image. */
export const uploadDoc = multer({
  storage,
  limits,
  fileFilter: fileFilterFor(docTypes),
});

/** Build the public URL served by the API for a stored file. */
export const publicFileUrl = (filename: string) => `/files/${filename}`;
