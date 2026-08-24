import { Role } from "@repo/shared";
import type { StudentDoc, GuardianshipDoc, UserDoc } from "../../utils/firebase";

// Admin/teacher: list all students (optionally by class)
export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const query = getQuery(event);
  const classId = typeof query.classId === "string" ? query.classId : undefined;

  let ref = collections.students() as FirebaseFirestore.Query;
  if (classId) ref = ref.where("classId", "==", classId);
  const snap = await ref.get();
  const students = snap.docs.map((d) => ({ id: d.id, ...(d.data() as StudentDoc) }));

  const classIds = [...new Set(students.map((s) => s.classId).filter((id): id is string => !!id))];
  const classDocs = classIds.length
    ? await adminDb().getAll(...classIds.map((id) => collections.classes().doc(id)))
    : [];
  const classById = new Map(classDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as { name: string }]));

  const guardianshipsSnap = await collections.guardianships().get();
  const guardianshipsByStudent = new Map<string, GuardianshipDoc[]>();
  for (const d of guardianshipsSnap.docs) {
    const g = d.data() as GuardianshipDoc;
    const list = guardianshipsByStudent.get(g.studentId) ?? [];
    list.push({ ...g, id: d.id } as GuardianshipDoc & { id: string });
    guardianshipsByStudent.set(g.studentId, list);
  }
  const parentIds = [...new Set(guardianshipsSnap.docs.map((d) => (d.data() as GuardianshipDoc).parentUserId))];
  const parentDocs = parentIds.length
    ? await adminDb().getAll(...parentIds.map((id) => collections.users().doc(id)))
    : [];
  const parentById = new Map(parentDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as UserDoc]));

  const result = students
    .map((s) => ({
      ...s,
      class: s.classId && classById.has(s.classId) ? { id: s.classId, name: classById.get(s.classId)!.name } : null,
      guardianships: (guardianshipsByStudent.get(s.id) ?? []).map((g: any) => ({
        id: g.id,
        relation: g.relation,
        parent: parentById.has(g.parentUserId)
          ? {
              id: g.parentUserId,
              name: parentById.get(g.parentUserId)!.name,
              email: parentById.get(g.parentUserId)!.email,
            }
          : null,
      })),
    }))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));

  return { students: result };
});
