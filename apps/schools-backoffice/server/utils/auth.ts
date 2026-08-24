import type { H3Event } from "h3";
import type { PlatformAdminDoc } from "./firebase";

export interface AuthedPlatformAdmin extends PlatformAdminDoc {
  id: string;
}

/**
 * Verify the Firebase ID token on the Authorization header, then load the
 * matching `platformAdmins/{uid}` Firestore profile — the schools-backoffice
 * equivalent of apps/school's requireUser(). A valid Firebase account with no
 * `platformAdmins` doc (e.g. an apps/school staff/parent account, or any
 * random signed-up user) is rejected here too: being a platform admin means
 * having a row in this collection, not just having a Firebase account.
 */
export async function requirePlatformAdmin(event: H3Event): Promise<AuthedPlatformAdmin> {
  const header = getHeader(event, "authorization");
  if (!header?.startsWith("Bearer ")) {
    throw httpError(401, "Authentication required");
  }

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(header.slice(7))).uid;
  } catch {
    throw httpError(401, "Invalid or expired token");
  }

  const snap = await collections.platformAdmins().doc(uid).get();
  if (!snap.exists) {
    throw httpError(403, "Platform admin access required");
  }
  return { id: uid, ...(snap.data() as PlatformAdminDoc) };
}
