import { updateTimetableSlotSchema, LUNCH_SUBJECT_ID, Role } from "@repo/shared";
import type { TimetableSlotDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const id = getRouterParam(event, "id")!;
  const body = await validateBody(event, updateTimetableSlotSchema);

  const ref = collections.timetableSlots().doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw httpError(404, "Timetable slot not found");
  const slot = existing.data() as TimetableSlotDoc;

  if (user.role === Role.TEACHER) {
    if (slot.teacherId !== user.id) {
      throw httpError(403, "Staff can only edit their own timetable slots");
    }
    if (body.teacherId && body.teacherId !== user.id) {
      throw httpError(403, "Staff can only assign timetable slots to themselves");
    }
  } else {
    await assertClassInSchool(slot.classId, user.schoolId);
  }

  const day = body.day ?? slot.day;
  const startTime = body.startTime ?? slot.startTime;
  if (body.day || body.startTime) {
    const clash = await collections
      .timetableSlots()
      .where("classId", "==", slot.classId)
      .where("day", "==", day)
      .where("startTime", "==", startTime)
      .get();
    if (clash.docs.some((d) => d.id !== id)) {
      throw httpError(409, "A slot already exists at that time on that day.");
    }
  }

  // Lunch is teacher-less and period-less — force both when the slot is (or
  // is becoming) Lunch, regardless of what was sent.
  const patch: Partial<TimetableSlotDoc> = { ...body };
  if ((body.subjectId ?? slot.subjectId) === LUNCH_SUBJECT_ID) {
    patch.teacherId = null;
    patch.period = null;
  }

  await ref.update(patch);
  const updated = await ref.get();
  return { slot: { id, ...(updated.data() as TimetableSlotDoc) } };
});
