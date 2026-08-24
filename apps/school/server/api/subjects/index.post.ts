import { createSubjectSchema, Role } from "@repo/shared";
import type { SubjectDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN]);
  const body = await validateBody(event, createSubjectSchema);

  const doc: SubjectDoc = {
    name: body.name,
    code: body.code ?? null,
    isActivity: body.isActivity ?? false,
  };
  // cuid-shaped id (see server/utils/id.ts) — createTimetableSlotSchema.subjectId
  // and markSchema.subjectId validate it with `.cuid()`.
  const id = newId();
  await collections.subjects().doc(id).set(doc);

  setResponseStatus(event, 201);
  return { subject: { id, ...doc } };
});
