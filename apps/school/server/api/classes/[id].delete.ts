import { Role } from "@repo/shared";

export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  await collections.classes().doc(id).delete();
  setResponseStatus(event, 204);
  return null;
});
