import { Role } from "@repo/shared";
import type { GuardianshipDoc } from "../../../utils/firebase";

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const existing = await collections.guardianships().doc(id).get();
  if (!existing.exists) throw httpError(404, "Guardianship not found");
  const { studentId } = existing.data() as GuardianshipDoc;
  await assertStudentInSchool(studentId, admin.schoolId);
  await collections.guardianships().doc(id).delete();
  setResponseStatus(event, 204);
  return null;
});
