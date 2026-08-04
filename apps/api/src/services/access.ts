import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";

/** Student ids that a given parent is a guardian of. */
export async function parentStudentIds(parentUserId: string): Promise<string[]> {
  const links = await prisma.guardianship.findMany({
    where: { parentUserId },
    select: { studentId: true },
  });
  return links.map((l) => l.studentId);
}

/** Throw 403 unless the parent is a guardian of the student. */
export async function assertParentOwnsStudent(parentUserId: string, studentId: string) {
  const link = await prisma.guardianship.findUnique({
    where: { parentUserId_studentId: { parentUserId, studentId } },
  });
  if (!link) throw new AppError(403, "This student is not linked to your account");
}

/** Class ids that a given teacher is the homeroom (class) teacher of. */
export async function teacherClassIds(teacherUserId: string): Promise<string[]> {
  const classes = await prisma.class.findMany({
    where: { homeroomTeacherId: teacherUserId },
    select: { id: true },
  });
  return classes.map((c) => c.id);
}

/** Throw 403 unless the teacher is the homeroom teacher of the given class. */
export async function assertTeacherOwnsClass(teacherUserId: string, classId: string) {
  const klass = await prisma.class.findFirst({
    where: { id: classId, homeroomTeacherId: teacherUserId },
    select: { id: true },
  });
  if (!klass) throw new AppError(403, "You can only manage attendance for your own class");
}

/** Throw 403 unless the given student is in one of the teacher's homeroom classes. */
export async function assertTeacherOwnsStudent(teacherUserId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, class: { homeroomTeacherId: teacherUserId } },
    select: { id: true },
  });
  if (!student) throw new AppError(403, "You can only manage attendance for your own class");
}

/** The parent guardians (user ids) of a given student — used to notify them. */
export async function guardianUserIds(studentId: string): Promise<string[]> {
  const links = await prisma.guardianship.findMany({
    where: { studentId },
    select: { parentUserId: true },
  });
  return links.map((l) => l.parentUserId);
}
