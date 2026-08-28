import { Role } from "@repo/shared";
import type { SubjectDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const existing = await collections.subjects().doc(id).get();
  if (!existing.exists || (existing.data() as SubjectDoc).schoolId !== user.schoolId) {
    throw httpError(404, "Subject not found");
  }
  await collections.subjects().doc(id).delete();
  setResponseStatus(event, 204);
  return null;
});
