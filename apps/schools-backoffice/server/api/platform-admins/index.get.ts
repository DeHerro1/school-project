import type { PlatformAdminDoc } from "../../utils/firebase";

// List every platform admin — any signed-in platform admin can see the roster.
export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event);

  const snap = await collections.platformAdmins().orderBy("createdAt", "asc").get();
  const admins = snap.docs.map((d) => ({ id: d.id, ...(d.data() as PlatformAdminDoc) }));
  return { admins };
});
