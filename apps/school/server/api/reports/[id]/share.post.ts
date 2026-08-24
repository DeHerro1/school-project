import { Role } from "@repo/shared";
import type { TermReportDoc, StudentDoc } from "../../../utils/firebase";

// Re-notify a student's guardians about an already-published report (the
// "Portal" share button on students/[id].vue — WhatsApp is composed client-side).
export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const id = getRouterParam(event, "id")!;

  const snap = await collections.termReports().doc(id).get();
  if (!snap.exists) throw httpError(404, "Report not found");
  const report = snap.data() as TermReportDoc;

  const studentSnap = await collections.students().doc(report.studentId).get();
  const student = studentSnap.exists ? (studentSnap.data() as StudentDoc) : null;

  const guardians = await guardianUserIds(report.studentId);
  await Promise.all(
    guardians.map((userId) =>
      notify({
        userId,
        type: "REPORT_SHARED",
        title: `${report.term} ${report.year} report for ${student?.firstName ?? "your child"} is ready`,
        body: "Your class teacher has shared a term report with you.",
        data: { studentId: report.studentId, reportId: id },
      }),
    ),
  );

  return { shared: guardians.length };
});
