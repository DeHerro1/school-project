import { Role } from "@repo/shared";
import type { StudentDoc, GuardianshipDoc, ClassDoc, UserDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = getRouterParam(event, "id")!;

  const snap = await collections.students().doc(id).get();
  if (!snap.exists) throw httpError(404, "Student not found");
  const s = snap.data() as StudentDoc;

  // A parent may only view their own child's profile; staff only their own
  // school's students.
  if (user.role === Role.PARENT) await assertParentOwnsStudent(user.id, id);
  else if (s.schoolId !== user.schoolId) throw httpError(404, "Student not found");

  const [classSnap, guardianshipsSnap] = await Promise.all([
    s.classId ? collections.classes().doc(s.classId).get() : null,
    collections.guardianships().where("studentId", "==", id).get(),
  ]);

  const parentIds = guardianshipsSnap.docs.map((d) => (d.data() as GuardianshipDoc).parentUserId);
  const parentDocs = parentIds.length
    ? await adminDb().getAll(...parentIds.map((pid) => collections.users().doc(pid)))
    : [];
  const parentById = new Map(parentDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as UserDoc]));

  return {
    student: {
      id,
      ...s,
      class: classSnap?.exists ? { id: s.classId, ...(classSnap.data() as ClassDoc) } : null,
      guardianships: guardianshipsSnap.docs.map((d) => {
        const g = d.data() as GuardianshipDoc;
        const parent = parentById.get(g.parentUserId);
        return {
          id: d.id,
          relation: g.relation,
          parent: parent
            ? { id: g.parentUserId, name: parent.name, email: parent.email, phone: parent.phone }
            : null,
        };
      }),
    },
  };
});
