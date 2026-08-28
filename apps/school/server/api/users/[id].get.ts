import { Role } from "@repo/shared";
import type { UserDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const snap = await collections.users().doc(id).get();
  const doc = snap.exists ? (snap.data() as UserDoc) : null;
  if (!doc || doc.schoolId !== admin.schoolId) throw httpError(404, "User not found");
  return { user: publicUser(id, doc) };
});
