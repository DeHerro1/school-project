import { Role } from "@repo/shared";
import type { StudentDoc } from "../../utils/firebase";

// A parent's own linked children — the parent portal's equivalent of the
// staff-side GET /students (which lists the whole school).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.PARENT]);
  const ids = await parentStudentIds(user.id);
  if (!ids.length) return { students: [] };

  const docs = await adminDb().getAll(...ids.map((id) => collections.students().doc(id)));
  const classIds = [
    ...new Set(
      docs.filter((d) => d.exists).map((d) => (d.data() as StudentDoc).classId).filter((id): id is string => !!id),
    ),
  ];
  const classDocs = classIds.length
    ? await adminDb().getAll(...classIds.map((id) => collections.classes().doc(id)))
    : [];
  const classById = new Map(
    classDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as { name: string; level: string }]),
  );

  const students = docs
    .filter((d) => d.exists)
    .map((d) => {
      const s = d.data() as StudentDoc;
      return {
        id: d.id,
        firstName: s.firstName,
        lastName: s.lastName,
        photoUrl: s.photoUrl,
        isFirstTime: s.isFirstTime,
        class: s.classId && classById.has(s.classId) ? { id: s.classId, ...classById.get(s.classId)! } : null,
      };
    })
    .sort((a, b) => a.firstName.localeCompare(b.firstName));

  return { students };
});
