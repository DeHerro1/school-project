import { Role } from "@repo/shared";
import type { UserDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const existing = await collections.users().doc(id).get();
  if (!existing.exists || (existing.data() as UserDoc).schoolId !== admin.schoolId) {
    throw httpError(404, "User not found");
  }
  await collections.users().doc(id).delete();
  try {
    await adminAuth().deleteUser(id);
  } catch (error) {
    console.error(`Failed to delete Firebase Auth user ${id} after Firestore delete`, error);
  }
  setResponseStatus(event, 204);
  return null;
});
