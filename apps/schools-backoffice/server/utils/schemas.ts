import { z } from "zod";

// Platform admins are schools-backoffice's own account model (see
// server/utils/firebase.ts's PlatformAdminDoc) — not part of @repo/shared's
// schemas, which cover apps/school's ADMIN/TEACHER/PARENT users instead.
export const createPlatformAdminSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(6),
});
