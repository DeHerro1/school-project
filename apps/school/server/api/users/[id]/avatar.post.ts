import { Role } from "@repo/shared";
import type { UserDoc } from "../../../utils/firebase";

// Upload / replace a user's profile photo (staff, parents, admins)
export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const file = await readUploadedImage(event);
  const avatarUrl = await storageUrl(file);

  const ref = collections.users().doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw httpError(404, "User not found");
  await ref.update({ avatarUrl });

  const updated = await ref.get();
  return { user: publicUser(id, updated.data() as UserDoc) };
});
