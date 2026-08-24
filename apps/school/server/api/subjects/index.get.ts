import { Role } from "@repo/shared";
import type { SubjectDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const snap = await collections.subjects().orderBy("name", "asc").get();
  return { subjects: snap.docs.map((d) => ({ id: d.id, ...(d.data() as SubjectDoc) })) };
});
