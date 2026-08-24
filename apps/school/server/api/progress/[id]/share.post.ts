import { Role } from "@repo/shared";
import type { ProgressDoc, StudentDoc } from "../../../utils/firebase";

// Re-notify a student's guardians about an already-published progress update.
export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const id = getRouterParam(event, "id")!;

  const snap = await collections.progress().doc(id).get();
  if (!snap.exists) throw httpError(404, "Progress update not found");
  const report = snap.data() as ProgressDoc;

  const studentSnap = await collections.students().doc(report.studentId).get();
  const student = studentSnap.exists ? (studentSnap.data() as StudentDoc) : null;

  const guardians = await guardianUserIds(report.studentId);
  await Promise.all(
    guardians.map((userId) =>
      notify({
        userId,
        type: "PROGRESS_SHARED",
        title: `New progress & talent update for ${student?.firstName ?? "your child"}`,
        body: report.talents || "Your class teacher has shared a progress update with you.",
        data: { studentId: report.studentId, progressId: id },
      }),
    ),
  );

  return { shared: guardians.length };
});
