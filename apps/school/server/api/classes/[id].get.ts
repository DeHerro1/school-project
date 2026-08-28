import { Role } from "@repo/shared";
import type { ClassDoc, StudentDoc, UserDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const id = getRouterParam(event, "id")!;

  const snap = await collections.classes().doc(id).get();
  if (!snap.exists) throw httpError(404, "Class not found");
  const c = snap.data() as ClassDoc;
  if (c.schoolId !== user.schoolId) throw httpError(404, "Class not found");

  const [teacherSnap, studentsSnap] = await Promise.all([
    c.homeroomTeacherId ? collections.users().doc(c.homeroomTeacherId).get() : null,
    collections.students().where("classId", "==", id).get(),
  ]);

  const students = studentsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as StudentDoc) }))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));

  return {
    class: {
      id: snap.id,
      ...c,
      homeroomTeacher:
        teacherSnap?.exists && c.homeroomTeacherId
          ? { id: c.homeroomTeacherId, name: (teacherSnap.data() as UserDoc).name }
          : null,
      students,
    },
  };
});
