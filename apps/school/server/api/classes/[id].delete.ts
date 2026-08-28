import { Role } from "@repo/shared";
import type { ClassDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const existing = await collections.classes().doc(id).get();
  if (!existing.exists || (existing.data() as ClassDoc).schoolId !== user.schoolId) {
    throw httpError(404, "Class not found");
  }
  await collections.classes().doc(id).delete();
  setResponseStatus(event, 204);
  return null;
});
