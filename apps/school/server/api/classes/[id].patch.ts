import { updateClassSchema, updateClassStaffSchema, Role } from "@repo/shared";
import type { ClassDoc } from "../../utils/firebase";

// Admins may edit any field; staff (teachers) may only update the declared
// student count and the subjects offered — the role picks the schema, so a
// teacher can never change the name, level or homeroom teacher.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const id = getRouterParam(event, "id")!;
  const schema = user.role === Role.ADMIN ? updateClassSchema : updateClassStaffSchema;
  const body = await validateBody(event, schema);

  const ref = collections.classes().doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw httpError(404, "Class not found");
  await ref.update(body as Partial<ClassDoc>);

  const updated = await ref.get();
  return { class: { id, ...(updated.data() as ClassDoc) } };
});
