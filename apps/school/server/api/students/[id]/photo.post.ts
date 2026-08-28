import { Role } from "@repo/shared";
import type { StudentDoc } from "../../../utils/firebase";

// Upload / replace a student's profile photo
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const id = getRouterParam(event, "id")!;
  const file = await readUploadedImage(event);
  const photoUrl = await storageUrl(file);

  const ref = collections.students().doc(id);
  const existing = await ref.get();
  if (!existing.exists || (existing.data() as StudentDoc).schoolId !== user.schoolId) {
    throw httpError(404, "Student not found");
  }
  await ref.update({ photoUrl });

  const updated = await ref.get();
  return { student: { id, ...(updated.data() as StudentDoc) } };
});
