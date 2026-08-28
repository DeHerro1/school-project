import { createSubjectSchema, Role } from "@repo/shared";
import type { SubjectDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const body = await validateBody(event, createSubjectSchema.partial());

  const ref = collections.subjects().doc(id);
  const existing = await ref.get();
  if (!existing.exists || (existing.data() as SubjectDoc).schoolId !== user.schoolId) {
    throw httpError(404, "Subject not found");
  }
  await ref.update(body as Partial<SubjectDoc>);

  const updated = await ref.get();
  return { subject: { id, ...(updated.data() as SubjectDoc) } };
});
