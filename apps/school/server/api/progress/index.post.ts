import { createProgressReportSchema, Role } from "@repo/shared";
import type { ProgressDoc, StudentDoc } from "../../utils/firebase";

// A class teacher writes a talent / guidance update. Notifies parents.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const body = await validateBody(event, createProgressReportSchema);
  await assertStudentInSchool(body.studentId, user.schoolId);

  const doc: ProgressDoc = {
    studentId: body.studentId,
    teacherId: user.id,
    term: body.term,
    strengths: body.strengths,
    talents: body.talents,
    needs: body.needs,
    howParentsCanHelp: body.howParentsCanHelp,
    createdAt: new Date().toISOString(),
  };
  const id = newId();
  await collections.progress().doc(id).set(doc);

  const studentSnap = await collections.students().doc(body.studentId).get();
  const student = studentSnap.exists ? (studentSnap.data() as StudentDoc) : null;
  const guardians = await guardianUserIds(body.studentId);
  await Promise.all(
    guardians.map((userId) =>
      notify({
        userId,
        type: "PROGRESS_PUBLISHED",
        title: `New progress & talent update for ${student?.firstName ?? "your child"}`,
        body: body.talents,
        data: { studentId: body.studentId, progressId: id },
      }),
    ),
  );

  setResponseStatus(event, 201);
  return { report: { id, ...doc } };
});
