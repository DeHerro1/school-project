import { Role } from "@repo/shared";
import type { TimetableSlotDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const id = getRouterParam(event, "id")!;
  const ref = collections.timetableSlots().doc(id);

  // Teachers may only remove their own slots; admins may remove any of
  // their own school's.
  const snap = await ref.get();
  if (!snap.exists) throw httpError(404, "Timetable slot not found");
  const slot = snap.data() as TimetableSlotDoc;
  if (user.role === Role.TEACHER) {
    if (slot.teacherId !== user.id) {
      throw httpError(403, "Staff can only remove their own timetable slots");
    }
  } else {
    await assertClassInSchool(slot.classId, user.schoolId);
  }
  await ref.delete();
  setResponseStatus(event, 204);
  return null;
});
