import { linkGuardianSchema, Role } from "@repo/shared";
import type { UserDoc, GuardianshipDoc } from "../../../utils/firebase";

// Link a parent as guardian of a student
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, [Role.ADMIN]);
  const body = await validateBody(event, linkGuardianSchema);

  const parentSnap = await collections.users().doc(body.parentUserId).get();
  const parent = parentSnap.exists ? (parentSnap.data() as UserDoc) : null;
  if (!parent || parent.role !== Role.PARENT || parent.schoolId !== admin.schoolId) {
    throw httpError(400, "Selected user is not a parent account");
  }
  await assertStudentInSchool(body.studentId, admin.schoolId);

  const doc: GuardianshipDoc = {
    parentUserId: body.parentUserId,
    studentId: body.studentId,
    relation: body.relation,
  };
  const ref = await collections.guardianships().add(doc);

  setResponseStatus(event, 201);
  return { guardianship: { id: ref.id, ...doc } };
});
