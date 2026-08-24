import { Role } from "@repo/shared";
import type { ProgressDoc, UserDoc } from "../../utils/firebase";

// Progress / talent guidance for a student — parents scoped to their own children.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const query = getQuery(event);
  const studentId = typeof query.studentId === "string" ? query.studentId : undefined;
  if (!studentId) throw httpError(400, "studentId is required");
  if (user.role === Role.PARENT) await assertParentOwnsStudent(user.id, studentId);

  const snap = await collections.progress().where("studentId", "==", studentId).get();
  const reports = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ProgressDoc) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const teacherIds = [...new Set(reports.map((r) => r.teacherId))];
  const teacherDocs = teacherIds.length
    ? await adminDb().getAll(...teacherIds.map((id) => collections.users().doc(id)))
    : [];
  const teacherById = new Map(teacherDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as UserDoc]));

  return {
    reports: reports.map((r) => ({
      ...r,
      teacher: teacherById.has(r.teacherId) ? { id: r.teacherId, name: teacherById.get(r.teacherId)!.name } : null,
    })),
  };
});
