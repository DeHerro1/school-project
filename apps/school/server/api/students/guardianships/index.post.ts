import { linkGuardianSchema, Role } from "@repo/shared";
import type { UserDoc, GuardianshipDoc } from "../../../utils/firebase";

// Link a parent as guardian of a student
export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN]);
  const body = await validateBody(event, linkGuardianSchema);

  const parentSnap = await collections.users().doc(body.parentUserId).get();
  if (!parentSnap.exists || (parentSnap.data() as UserDoc).role !== Role.PARENT) {
    throw httpError(400, "Selected user is not a parent account");
  }

  const doc: GuardianshipDoc = {
    parentUserId: body.parentUserId,
    studentId: body.studentId,
    relation: body.relation,
  };
  const ref = await collections.guardianships().add(doc);

  setResponseStatus(event, 201);
  return { guardianship: { id: ref.id, ...doc } };
});
