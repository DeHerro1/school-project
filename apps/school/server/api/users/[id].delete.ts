import { Role } from "@repo/shared";

export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  await collections.users().doc(id).delete();
  try {
    await adminAuth().deleteUser(id);
  } catch (error) {
    console.error(`Failed to delete Firebase Auth user ${id} after Firestore delete`, error);
  }
  setResponseStatus(event, 204);
  return null;
});
