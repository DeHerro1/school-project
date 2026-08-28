import { Role } from "@repo/shared";
import type { SubjectDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  // Sorted in memory rather than via orderBy() — see classes/index.get.ts.
  const snap = await collections.subjects().where("schoolId", "==", user.schoolId).get();
  const subjects = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as SubjectDoc) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { subjects };
});
