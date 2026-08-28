import { createStudentSchema, Role } from "@repo/shared";
import type { StudentDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const body = await validateBody(event, createStudentSchema);

  // A homeroom teacher may only enrol students into their own class.
  if (user.role === Role.TEACHER) {
    if (!body.classId) throw httpError(400, "A class is required");
    await assertTeacherOwnsClass(user.id, body.classId);
  } else if (body.classId) {
    await assertClassInSchool(body.classId, user.schoolId);
  }

  const doc: StudentDoc = {
    admissionNo: body.admissionNo || (await generateAdmissionNo()),
    firstName: body.firstName,
    lastName: body.lastName,
    dob: body.dob.toISOString(),
    photoUrl: null,
    isFirstTime: body.isFirstTime ?? false,
    classId: body.classId ?? null,
    guardianName: body.guardianName ?? null,
    guardianPhone: body.guardianPhone ?? null,
    secondaryGuardianName: body.secondaryGuardianName ?? null,
    secondaryGuardianPhone: body.secondaryGuardianPhone ?? null,
    address: body.address ?? null,
    createdAt: new Date().toISOString(),
    schoolId: user.schoolId,
  };
  // cuid-shaped id (see server/utils/id.ts) — almost every schema that
  // references a student (attendance, alerts, guardianships, ...) validates
  // it with `.cuid()`.
  const id = newId();
  await collections.students().doc(id).set(doc);

  setResponseStatus(event, 201);
  return { student: { id, ...doc } };
});
