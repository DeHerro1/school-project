import { Role } from "@repo/shared";
import type { MediaDoc, UserDoc } from "../../utils/firebase";

// Photo feed for a student — parents are scoped to their own children.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const query = getQuery(event);
  const studentId = typeof query.studentId === "string" ? query.studentId : undefined;
  if (!studentId) throw httpError(400, "studentId is required");
  if (user.role === Role.PARENT) await assertParentOwnsStudent(user.id, studentId);
  else await assertStudentInSchool(studentId, user.schoolId);

  const snap = await collections.media().where("studentId", "==", studentId).get();
  const items = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as MediaDoc) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const teacherIds = [...new Set(items.map((m) => m.teacherId))];
  const teacherDocs = teacherIds.length
    ? await adminDb().getAll(...teacherIds.map((id) => collections.users().doc(id)))
    : [];
  const teacherById = new Map(teacherDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as UserDoc]));

  return {
    media: items.map((m) => ({
      ...m,
      teacher: teacherById.has(m.teacherId) ? { id: m.teacherId, name: teacherById.get(m.teacherId)!.name } : null,
    })),
  };
});
