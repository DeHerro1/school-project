import { createTermReportSchema, Role } from "@repo/shared";
import type { TermReportDoc, MarkDoc, StudentDoc } from "../../utils/firebase";

const gradeFor = (score: number) => (score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D");

// A class teacher publishes a term report (with structured marks). Notifies parents.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const body = await validateBody(event, createTermReportSchema);

  const studentSnap = await collections.students().doc(body.studentId).get();
  if (!studentSnap.exists) throw httpError(404, "Student not found");
  const student = studentSnap.data() as StudentDoc;

  const doc: TermReportDoc = {
    studentId: body.studentId,
    term: body.term,
    year: body.year,
    fileUrl: null,
    classId: student.classId,
    promotedToClassId: body.promotedToClassId ?? null,
    reopenDate: body.reopenDate ? new Date(body.reopenDate).toISOString() : null,
    promotionAppliedAt: null,
    positionInClass: body.positionInClass ?? null,
    progress: body.progress ?? null,
    interest: body.interest ?? null,
    strength: body.strength ?? null,
    howParentsCanHelp: body.howParentsCanHelp ?? null,
    createdAt: new Date().toISOString(),
  };
  const id = newId();
  await collections.termReports().doc(id).set(doc);

  const marks = body.marks ?? [];
  await Promise.all(
    marks.map((m) => {
      const markDoc: MarkDoc = {
        termReportId: id,
        subjectId: m.subjectId,
        score: m.score,
        grade: m.grade ?? gradeFor(m.score),
        comment: m.comment ?? null,
      };
      return collections.marks().doc(newId()).set(markDoc);
    }),
  );

  const guardians = await guardianUserIds(body.studentId);
  await Promise.all(
    guardians.map((userId) =>
      notify({
        userId,
        type: "REPORT_PUBLISHED",
        title: `${body.term} ${body.year} report for ${student.firstName} is ready`,
        data: { studentId: body.studentId, reportId: id },
      }),
    ),
  );

  setResponseStatus(event, 201);
  return { report: { id, ...doc, marks } };
});
