import { createPlatformAdminSchema } from "../../utils/schemas";
import type { PlatformAdminDoc } from "../../utils/firebase";

// An existing platform admin adds another. There is deliberately no public
// self-signup route for this collection — the very first admin is created by
// server/scripts/seed.ts, and every one after that is added from this app's
// own Admins page by someone already trusted.
export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event);
  const body = await validateBody(event, createPlatformAdminSchema);

  let uid: string;
  try {
    const created = await adminAuth().createUser({
      email: body.email,
      password: body.password,
      displayName: body.name,
      emailVerified: true, // no email-confirmation round trip needed for this project
    });
    uid = created.uid;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create account";
    throw httpError(400, message);
  }

  const doc: PlatformAdminDoc = {
    email: body.email,
    name: body.name,
    createdAt: new Date().toISOString(),
  };

  try {
    await collections.platformAdmins().doc(uid).set(doc);
  } catch (err) {
    try {
      await adminAuth().deleteUser(uid);
    } catch (cleanupError) {
      console.error(
        `platform-admins.post: failed to roll back orphaned Firebase Auth user ${uid} after Firestore write failure`,
        cleanupError,
      );
    }
    throw err;
  }

  setResponseStatus(event, 201);
  return { admin: { id: uid, ...doc } };
});
