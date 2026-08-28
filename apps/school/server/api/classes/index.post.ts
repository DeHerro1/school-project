import { createClassSchema, Role } from "@repo/shared";
import type { ClassDoc } from "../../utils/firebase";

// No real roll count exists yet at creation time (students are enrolled into
// the class afterwards), so an admin who doesn't type one in gets a
// plausible placeholder instead of a blank/zero — 31-60, always above 30.
function randomStudentCount(): number {
  return 31 + Math.floor(Math.random() * 30);
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN]);
  const body = await validateBody(event, createClassSchema);

  const doc: ClassDoc = {
    name: body.name,
    level: body.level,
    homeroomTeacherId: body.homeroomTeacherId ?? null,
    studentCount: body.studentCount ?? randomStudentCount(),
    subjectsOffered: body.subjectsOffered ?? null,
    createdAt: new Date().toISOString(),
    schoolId: user.schoolId,
  };
  // A cuid-shaped id, not Firestore's own auto-id — @repo/shared's Zod
  // schemas validate class ids elsewhere (e.g. createStudentSchema.classId)
  // with `.cuid()` (see server/utils/id.ts).
  const id = newId();
  await collections.classes().doc(id).set(doc);

  setResponseStatus(event, 201);
  return { class: { id, ...doc } };
});
