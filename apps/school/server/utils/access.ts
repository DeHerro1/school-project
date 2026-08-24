// Ownership checks for staff (ADMIN/TEACHER) and parents alike — the
// Firestore equivalent of apps/api/src/services/access.ts.

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
