import { bulkAttendanceSchema, Role } from "@repo/shared";
import type { AttendanceDoc } from "../../utils/firebase";

// Mark a whole class at once — staff (teachers) only.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.TEACHER]);
  const body = await validateBody(event, bulkAttendanceSchema);
  const date = dateOnly(body.date);

  // Every student in the batch must belong to the teacher's own class.
  await Promise.all(body.entries.map((e) => assertTeacherOwnsStudent(user.id, e.studentId)));

  const db = adminDb();
  const batch = db.batch();
  const now = new Date().toISOString();
  const existingDocs = await db.getAll(
    ...body.entries.map((e) => collections.attendance().doc(`${e.studentId}_${date}`)),
  );
  body.entries.forEach((e, i) => {
    const ref = collections.attendance().doc(`${e.studentId}_${date}`);
    const doc: AttendanceDoc = {
      studentId: e.studentId,
      date,
      status: e.status,
      markedById: user.id,
      createdAt: existingDocs[i]!.exists ? (existingDocs[i]!.data() as AttendanceDoc).createdAt : now,
    };
    batch.set(ref, doc);
  });
  await batch.commit();

  return { count: body.entries.length };
});
