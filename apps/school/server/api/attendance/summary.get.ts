import { Role, AttendanceStatus } from "@repo/shared";
import type { ClassDoc, AttendanceDoc } from "../../utils/firebase";

// Per-class attendance summary for a given day (admin/head overview).
// One card per class: total students, present and absent counts.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const query = getQuery(event);
  const date = dateOnly(typeof query.date === "string" ? query.date : undefined);

  // Sorted in memory rather than via orderBy() — see classes/index.get.ts.
  // Both classes and students are scoped to the caller's own school; the
  // attendance query stays date-only (no schoolId on AttendanceDoc) — records
  // for other schools' students are dropped below via classByStudent, which
  // is itself school-scoped.
  const [classesSnap, studentsSnap, attendanceSnap] = await Promise.all([
    collections.classes().where("schoolId", "==", user.schoolId).get(),
    collections.students().where("schoolId", "==", user.schoolId).select("classId").get(),
    collections.attendance().where("date", "==", date).get(),
  ]);
  classesSnap.docs.sort((a, b) => (a.data() as ClassDoc).name.localeCompare((b.data() as ClassDoc).name));

  const totalByClass = new Map<string, number>();
  for (const d of studentsSnap.docs) {
    const classId = (d.data() as { classId: string | null }).classId;
    if (!classId) continue;
    totalByClass.set(classId, (totalByClass.get(classId) ?? 0) + 1);
  }

  // studentId -> classId, so each attendance record can be tallied by class
  // (reuses studentsSnap — already scoped and already selecting classId).
  const classByStudent = new Map(
    studentsSnap.docs.map((d) => [d.id, (d.data() as { classId: string | null }).classId]),
  );

  const tally = new Map<string, { present: number; absent: number; late: number }>();
  for (const d of attendanceSnap.docs) {
    const r = d.data() as AttendanceDoc;
    const classId = classByStudent.get(r.studentId);
    if (!classId) continue;
    const entry = tally.get(classId) ?? { present: 0, absent: 0, late: 0 };
    if (r.status === AttendanceStatus.PRESENT) entry.present++;
    else if (r.status === AttendanceStatus.ABSENT) entry.absent++;
    else if (r.status === AttendanceStatus.LATE) entry.late++;
    tally.set(classId, entry);
  }

  const summary = classesSnap.docs.map((d) => {
    const c = d.data() as ClassDoc;
    const t = tally.get(d.id) ?? { present: 0, absent: 0, late: 0 };
    return {
      id: d.id,
      name: c.name,
      level: c.level,
      homeroomTeacherId: c.homeroomTeacherId,
      total: totalByClass.get(d.id) ?? 0,
      present: t.present,
      absent: t.absent,
      late: t.late,
    };
  });

  return { date: new Date(`${date}T00:00:00.000Z`).toISOString(), classes: summary };
});
