import { Role } from "@repo/shared";
import type { TermReportDoc, MarkDoc, SubjectDoc, ClassDoc } from "../../utils/firebase";

// Term reports for a student — parents are scoped to their own children.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const query = getQuery(event);
  const studentId = typeof query.studentId === "string" ? query.studentId : undefined;
  if (!studentId) throw httpError(400, "studentId is required");
  if (user.role === Role.PARENT) await assertParentOwnsStudent(user.id, studentId);
  else await assertStudentInSchool(studentId, user.schoolId);

  const snap = await collections.termReports().where("studentId", "==", studentId).get();
  const reports = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as TermReportDoc) }))
    .sort((a, b) => b.year - a.year || b.term.localeCompare(a.term));

  const marksByReport = new Map<string, { id: string; data: MarkDoc }[]>();
  for (const r of reports) {
    const ms = await collections.marks().where("termReportId", "==", r.id).get();
    marksByReport.set(r.id, ms.docs.map((d) => ({ id: d.id, data: d.data() as MarkDoc })));
  }

  const subjectIds = [...new Set([...marksByReport.values()].flat().map((m) => m.data.subjectId))];
  const classIds = [
    ...new Set(
      reports.flatMap((r) => [r.classId, r.promotedToClassId]).filter((id): id is string => !!id),
    ),
  ];
  const [subjectDocs, classDocs] = await Promise.all([
    subjectIds.length ? adminDb().getAll(...subjectIds.map((id) => collections.subjects().doc(id))) : [],
    classIds.length ? adminDb().getAll(...classIds.map((id) => collections.classes().doc(id))) : [],
  ]);
  const subjectById = new Map(subjectDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as SubjectDoc]));
  const classById = new Map(classDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as ClassDoc]));
  const classRef = (id: string | null) =>
    id && classById.has(id) ? { id, name: classById.get(id)!.name, level: classById.get(id)!.level } : null;

  // Class size, for "position N out of <totalStudents>" — one query per
  // distinct class among these reports, not per report.
  const totalsByClass = new Map<string, number>();
  for (const classId of classIds) {
    if (totalsByClass.has(classId)) continue;
    const count = await collections.students().where("classId", "==", classId).get();
    totalsByClass.set(classId, count.docs.length);
  }

  return {
    reports: reports.map((r) => ({
      ...r,
      class: classRef(r.classId),
      promotedToClass: classRef(r.promotedToClassId),
      marks: (marksByReport.get(r.id) ?? []).map((m) => ({
        id: m.id,
        ...m.data,
        subject: subjectById.has(m.data.subjectId)
          ? { id: m.data.subjectId, name: subjectById.get(m.data.subjectId)!.name }
          : null,
      })),
      totalStudents: r.classId ? totalsByClass.get(r.classId) ?? null : null,
    })),
  };
});
