import { Role } from "@repo/shared";
import type { UserDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const snap = await collections.users().doc(id).get();
  if (!snap.exists) throw httpError(404, "User not found");
  return { user: publicUser(id, snap.data() as UserDoc) };
});
