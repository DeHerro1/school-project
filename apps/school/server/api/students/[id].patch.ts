import { updateStudentSchema, Role } from "@repo/shared";
import type { StudentDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const body = await validateBody(event, updateStudentSchema);

  const ref = collections.students().doc(id);
  const existing = await ref.get();
  if (!existing.exists || (existing.data() as StudentDoc).schoolId !== user.schoolId) {
    throw httpError(404, "Student not found");
  }
  if (body.classId) await assertClassInSchool(body.classId, user.schoolId);

  const patch: Record<string, unknown> = { ...body };
  if (body.dob) patch.dob = body.dob.toISOString();
  await ref.update(patch);

  const updated = await ref.get();
  return { student: { id, ...(updated.data() as StudentDoc) } };
});
