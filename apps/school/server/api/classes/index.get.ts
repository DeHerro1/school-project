import { Role } from "@repo/shared";
import type { ClassDoc, UserDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN, Role.TEACHER]);

  const [classesSnap, studentsSnap] = await Promise.all([
    collections.classes().orderBy("name", "asc").get(),
    collections.students().select("classId").get(),
  ]);

  const studentCountByClass = new Map<string, number>();
  for (const d of studentsSnap.docs) {
    const classId = (d.data() as { classId: string | null }).classId;
    if (!classId) continue;
    studentCountByClass.set(classId, (studentCountByClass.get(classId) ?? 0) + 1);
  }

  const teacherIds = [
    ...new Set(
      classesSnap.docs
        .map((d) => (d.data() as ClassDoc).homeroomTeacherId)
        .filter((id): id is string => !!id),
    ),
  ];
  const teacherDocs = teacherIds.length
    ? await adminDb().getAll(...teacherIds.map((id) => collections.users().doc(id)))
    : [];
  const teacherById = new Map(
    teacherDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as UserDoc]),
  );

  const classes = classesSnap.docs.map((d) => {
    const c = d.data() as ClassDoc;
    const teacher = c.homeroomTeacherId ? teacherById.get(c.homeroomTeacherId) : undefined;
    return {
      id: d.id,
      ...c,
      homeroomTeacher: teacher ? { id: c.homeroomTeacherId, name: teacher.name } : null,
      _count: { students: studentCountByClass.get(d.id) ?? 0 },
    };
  });

  return { classes };
});
