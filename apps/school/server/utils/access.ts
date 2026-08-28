// Ownership checks for staff (ADMIN/TEACHER) and parents alike — the
// Firestore equivalent of apps/api/src/services/access.ts.

import { Role } from "@repo/shared";

/** Every admin (headmaster) user id at the given school. */
async function adminIdsForSchool(schoolId: string): Promise<string[]> {
  const snap = await collections.users().where("role", "==", Role.ADMIN).where("schoolId", "==", schoolId).get();
  return snap.docs.map((d) => d.id);
}

/** Student ids that a given parent is a guardian of. */
export async function parentStudentIds(parentUserId: string): Promise<string[]> {
  const snap = await collections.guardianships().where("parentUserId", "==", parentUserId).get();
  return snap.docs.map((d) => (d.data() as { studentId: string }).studentId);
}

/** Throw 403 unless the parent is a guardian of the student. */
export async function assertParentOwnsStudent(parentUserId: string, studentId: string) {
  const snap = await collections
    .guardianships()
    .where("parentUserId", "==", parentUserId)
    .where("studentId", "==", studentId)
    .limit(1)
    .get();
  if (snap.empty) throw httpError(403, "This student is not linked to your account");
}

/** Class ids that a given teacher is the homeroom (class) teacher of. */
export async function teacherClassIds(teacherUserId: string): Promise<string[]> {
  const snap = await collections.classes().where("homeroomTeacherId", "==", teacherUserId).get();
  return snap.docs.map((d) => d.id);
}

/** Throw 403 unless the teacher is the homeroom teacher of the given class. */
export async function assertTeacherOwnsClass(teacherUserId: string, classId: string) {
  const doc = await collections.classes().doc(classId).get();
  if (!doc.exists || (doc.data() as { homeroomTeacherId: string | null }).homeroomTeacherId !== teacherUserId) {
    throw httpError(403, "You can only manage attendance for your own class");
  }
}

/** Throw 403 unless the given student is in one of the teacher's homeroom classes. */
export async function assertTeacherOwnsStudent(teacherUserId: string, studentId: string) {
  const doc = await collections.students().doc(studentId).get();
  if (!doc.exists) throw httpError(404, "Student not found");
  const classId = (doc.data() as { classId: string | null }).classId;
  if (!classId) throw httpError(403, "You can only manage attendance for your own class");
  await assertTeacherOwnsClass(teacherUserId, classId);
}

/** The parent guardians (user ids) of a given student — used to notify them. */
export async function guardianUserIds(studentId: string): Promise<string[]> {
  const snap = await collections.guardianships().where("studentId", "==", studentId).get();
  return snap.docs.map((d) => (d.data() as { parentUserId: string }).parentUserId);
}

/**
 * Throw 404 unless `studentId` belongs to `schoolId` — the staff-side
 * equivalent of assertParentOwnsStudent(), used wherever a staff member
 * reaches a student record by id (attendance, media, reports, progress,
 * invoices, ...) so one school's admins/teachers can't read or act on
 * another school's students just by guessing/reusing an id. 404 (not 403)
 * so a cross-tenant id doesn't confirm the record exists elsewhere.
 */
export async function assertStudentInSchool(studentId: string, schoolId: string) {
  const snap = await collections.students().doc(studentId).get();
  if (!snap.exists || (snap.data() as { schoolId: string }).schoolId !== schoolId) {
    throw httpError(404, "Student not found");
  }
}

/** Throw 404 unless `classId` belongs to `schoolId` (see assertStudentInSchool). */
export async function assertClassInSchool(classId: string, schoolId: string) {
  const snap = await collections.classes().doc(classId).get();
  if (!snap.exists || (snap.data() as { schoolId: string }).schoolId !== schoolId) {
    throw httpError(404, "Class not found");
  }
}

/**
 * Ids of every user a PARENT may message: the homeroom teacher(s) of their
 * linked children's classes, plus every admin (headmaster) at the school.
 * Shared by the contacts list and the send guard, so both stay in sync.
 */
export async function parentContactIds(parentUserId: string, schoolId: string): Promise<string[]> {
  const studentIds = await parentStudentIds(parentUserId);
  const studentDocs = studentIds.length
    ? await adminDb().getAll(...studentIds.map((id) => collections.students().doc(id)))
    : [];
  const classIds = [
    ...new Set(
      studentDocs
        .filter((d) => d.exists)
        .map((d) => (d.data() as { classId: string | null }).classId)
        .filter((id): id is string => !!id),
    ),
  ];
  const classDocs = classIds.length
    ? await adminDb().getAll(...classIds.map((id) => collections.classes().doc(id)))
    : [];
  const teacherIds = [
    ...new Set(
      classDocs
        .filter((d) => d.exists)
        .map((d) => (d.data() as { homeroomTeacherId: string | null }).homeroomTeacherId)
        .filter((id): id is string => !!id),
    ),
  ];
  return [...teacherIds, ...(await adminIdsForSchool(schoolId))];
}

/**
 * Ids of every user a TEACHER may message: parents of the students in their
 * homeroom class(es), plus every admin (headmaster) at the school.
 */
export async function teacherContactIds(teacherUserId: string, schoolId: string): Promise<string[]> {
  const classIds = await teacherClassIds(teacherUserId);

  const studentIds = new Set<string>();
  for (let i = 0; i < classIds.length; i += 30) {
    const chunk = classIds.slice(i, i + 30);
    const snap = await collections.students().where("classId", "in", chunk).get();
    snap.docs.forEach((d) => studentIds.add(d.id));
  }

  const parentIds = new Set<string>();
  const allStudentIds = [...studentIds];
  for (let i = 0; i < allStudentIds.length; i += 30) {
    const chunk = allStudentIds.slice(i, i + 30);
    const snap = await collections.guardianships().where("studentId", "in", chunk).get();
    snap.docs.forEach((d) => parentIds.add((d.data() as { parentUserId: string }).parentUserId));
  }

  return [...parentIds, ...(await adminIdsForSchool(schoolId))];
}
