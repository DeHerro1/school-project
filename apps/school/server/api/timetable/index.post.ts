import { createTimetableSlotSchema, LUNCH_SUBJECT_ID, Role, Weekday } from "@repo/shared";
import type { TimetableSlotDoc } from "../../utils/firebase";

/** True if a slot already exists at this class/day/startTime (the old @@unique). */
async function slotTaken(classId: string, day: string, startTime: string) {
  const snap = await collections
    .timetableSlots()
    .where("classId", "==", classId)
    .where("day", "==", day)
    .where("startTime", "==", startTime)
    .limit(1)
    .get();
  return !snap.empty;
}

// Both admins and staff (teachers) may build the timetable. A teacher can
// only add slots for themselves — they see and manage what they're assigned to.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const body = await validateBody(event, createTimetableSlotSchema);

  if (user.role === Role.TEACHER && body.teacherId && body.teacherId !== user.id) {
    throw httpError(403, "Staff can only add timetable slots for themselves");
  }
  if (user.role === Role.TEACHER) {
    await assertTeacherOwnsClass(user.id, body.classId);
  } else {
    await assertClassInSchool(body.classId, user.schoolId);
  }

  const { repeat, ...data } = body;
  const isLunch = data.subjectId === LUNCH_SUBJECT_ID;
  const base: Omit<TimetableSlotDoc, "day"> = {
    classId: data.classId,
    subjectId: data.subjectId,
    // Lunch is teacher-less and period-less, regardless of what was sent.
    teacherId: isLunch ? null : (data.teacherId ?? null),
    period: isLunch ? null : (data.period ?? null),
    startTime: data.startTime,
    endTime: data.endTime,
  };

  // Recurring: place the slot on every school day for the term. Days that
  // already have a slot at this time are skipped rather than erroring.
  if (repeat) {
    const weekdays: string[] = [Weekday.MON, Weekday.TUE, Weekday.WED, Weekday.THU, Weekday.FRI];
    let count = 0;
    for (const day of weekdays) {
      if (await slotTaken(base.classId, day, base.startTime!)) continue;
      await collections.timetableSlots().doc(newId()).set({ ...base, day });
      count++;
    }
    setResponseStatus(event, 201);
    return { count };
  }

  if (await slotTaken(base.classId, data.day, base.startTime!)) {
    throw httpError(409, "A slot already exists at that time on that day.");
  }
  const id = newId();
  await collections.timetableSlots().doc(id).set({ ...base, day: data.day });
  setResponseStatus(event, 201);
  return { slot: { id, ...base, day: data.day } };
});
