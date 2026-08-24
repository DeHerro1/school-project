import { Role } from "@repo/shared";
import type { StudentDoc, ClassDoc } from "../../../utils/firebase";

// Share a student's profile with their parents via the parent portal.
export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const id = getRouterParam(event, "id")!;

  const snap = await collections.students().doc(id).get();
  if (!snap.exists) throw httpError(404, "Student not found");
  const student = snap.data() as StudentDoc;
  const klass = student.classId ? await collections.classes().doc(student.classId).get() : null;
  const className = klass?.exists ? (klass.data() as ClassDoc).name : undefined;

  const guardians = await guardianUserIds(id);
  await Promise.all(
    guardians.map((userId) =>
      notify({
        userId,
        type: "PROFILE_SHARED",
        title: `${student.firstName} ${student.lastName}'s profile`,
        body: `Admission No ${student.admissionNo} · ${className ?? "No class"}`,
        data: { studentId: id },
      }),
    ),
  );

  return { shared: guardians.length };
});
