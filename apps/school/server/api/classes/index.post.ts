import { createClassSchema, Role } from "@repo/shared";
import type { ClassDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN]);
  const body = await validateBody(event, createClassSchema);

  const doc: ClassDoc = {
    name: body.name,
    level: body.level,
    homeroomTeacherId: body.homeroomTeacherId ?? null,
    studentCount: body.studentCount ?? null,
    subjectsOffered: body.subjectsOffered ?? null,
    createdAt: new Date().toISOString(),
  };
  // A cuid-shaped id, not Firestore's own auto-id — @repo/shared's Zod
  // schemas validate class ids elsewhere (e.g. createStudentSchema.classId)
  // with `.cuid()` (see server/utils/id.ts).
  const id = newId();
  await collections.classes().doc(id).set(doc);

  setResponseStatus(event, 201);
  return { class: { id, ...doc } };
});
