import { LUNCH_SUBJECT, LUNCH_SUBJECT_ID, Role, Weekday } from "@repo/shared";
import type { SubjectDoc, TimetableSlotDoc, UserDoc, ClassDoc } from "../../utils/firebase";

const dayOrder: Record<string, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4 };

async function findSlots(classId?: string | string[]) {
  let ref = collections.timetableSlots() as FirebaseFirestore.Query;
  if (Array.isArray(classId)) {
    if (classId.length === 0) return [];
    ref = ref.where("classId", "in", classId.slice(0, 30));
  } else if (classId) {
    ref = ref.where("classId", "==", classId);
  }
  const snap = await ref.get();
  const slots = snap.docs.map((d) => ({ id: d.id, ...(d.data() as TimetableSlotDoc) }));

  // Lunch isn't a real `subjects` doc (see LUNCH_SUBJECT_ID) — excluded from
  // the batch-get and resolved to the hardcoded LUNCH_SUBJECT below instead.
  const subjectIds = [...new Set(slots.map((s) => s.subjectId).filter((id) => id !== LUNCH_SUBJECT_ID))];
  const teacherIds = [...new Set(slots.map((s) => s.teacherId).filter((id): id is string => !!id))];
  const classIds = [...new Set(slots.map((s) => s.classId))];

  const [subjectDocs, teacherDocs, classDocs] = await Promise.all([
    subjectIds.length ? adminDb().getAll(...subjectIds.map((id) => collections.subjects().doc(id))) : [],
    teacherIds.length ? adminDb().getAll(...teacherIds.map((id) => collections.users().doc(id))) : [],
    classIds.length ? adminDb().getAll(...classIds.map((id) => collections.classes().doc(id))) : [],
  ]);
  const subjectById = new Map(subjectDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as SubjectDoc]));
  const teacherById = new Map(teacherDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as UserDoc]));
  const classById = new Map(classDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as ClassDoc]));

  return slots
    .map((s) => ({
      ...s,
      subject:
        s.subjectId === LUNCH_SUBJECT_ID
          ? { id: LUNCH_SUBJECT.id, name: LUNCH_SUBJECT.name, isActivity: LUNCH_SUBJECT.isActivity }
          : subjectById.has(s.subjectId)
            ? {
                id: s.subjectId,
                name: subjectById.get(s.subjectId)!.name,
                isActivity: subjectById.get(s.subjectId)!.isActivity,
              }
            : null,
      teacher: s.teacherId && teacherById.has(s.teacherId)
        ? { id: s.teacherId, name: teacherById.get(s.teacherId)!.name }
        : null,
      class: classById.has(s.classId) ? { id: s.classId, name: classById.get(s.classId)!.name } : null,
    }))
    .sort(
      (a, b) =>
        (dayOrder[a.day] ?? 0) - (dayOrder[b.day] ?? 0) ||
        (a.startTime ?? "").localeCompare(b.startTime ?? ""),
    );
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const query = getQuery(event);
  let classId = typeof query.classId === "string" ? query.classId : undefined;

  // A parent (or a student-scoped request) resolves to that student's class.
  const studentId = typeof query.studentId === "string" ? query.studentId : undefined;
  if (studentId) {
    if (user.role === Role.PARENT) await assertParentOwnsStudent(user.id, studentId);
    const studentSnap = await collections.students().doc(studentId).get();
    const student = studentSnap.exists ? (studentSnap.data() as { classId: string | null; schoolId: string }) : null;
    if (!student || (user.role !== Role.PARENT && student.schoolId !== user.schoolId)) {
      throw httpError(404, "Student not found");
    }
    classId = student.classId ?? undefined;
    if (!classId) return { slots: [] };
    return { slots: await findSlots(classId) };
  }

  // Staff (teachers) may only view the timetable of their own homeroom
  // class(es) — never another class's, and never the whole school's.
  if (user.role === Role.TEACHER) {
    const ownClassIds = await teacherClassIds(user.id);
    if (classId) {
      if (!ownClassIds.includes(classId)) {
        throw httpError(403, "You can only view the timetable for your own class");
      }
      return { slots: await findSlots(classId) };
    }
    if (ownClassIds.length === 0) return { slots: [] };
    return { slots: await findSlots(ownClassIds) };
  }

  // Admins: scoped to their own school's classes — never another school's.
  if (classId) {
    await assertClassInSchool(classId, user.schoolId);
    return { slots: await findSlots(classId) };
  }
  const ownClassesSnap = await collections.classes().where("schoolId", "==", user.schoolId).get();
  const ownClassIds = ownClassesSnap.docs.map((d) => d.id);
  if (ownClassIds.length === 0) return { slots: [] };
  return { slots: await findSlots(ownClassIds) };
});
