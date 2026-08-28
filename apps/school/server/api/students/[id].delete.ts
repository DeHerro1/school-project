import { Role } from "@repo/shared";
import type { StudentDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const existing = await collections.students().doc(id).get();
  if (!existing.exists || (existing.data() as StudentDoc).schoolId !== user.schoolId) {
    throw httpError(404, "Student not found");
  }
  await collections.students().doc(id).delete();
  setResponseStatus(event, 204);
  return null;
});
