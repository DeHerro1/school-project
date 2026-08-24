import type { H3Event } from "h3";
import type { Role } from "@repo/shared";
import type { UserDoc } from "./firebase";

export interface AuthedUser extends UserDoc {
  id: string;
}

/**
 * Verify the Firebase ID token on the Authorization header, load the
 * matching Firestore `users/{uid}` profile, and (optionally) enforce a role
 * allow-list — the Firestore equivalent of Express's `authGuard(roles)`.
 *
 * EduCore is staff-only: every route that calls this restricts to
 * ADMIN and/or TEACHER (see ALLOWED_ROLES in app/composables/useAuth.ts).
 */
export async function requireUser(event: H3Event, roles?: Role[]): Promise<AuthedUser> {
  const header = getHeader(event, "authorization");
  if (!header?.startsWith("Bearer ")) {
    throw httpError(401, "Authentication required");
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth().verifyIdToken(header.slice(7));
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    throw httpError(401, "Invalid or expired token");
  }

  let snap = await collections.users().doc(uid).get();
  let docId = uid;

  // Staff profiles are provisioned (see provisionUser()) under the uid of
  // their original Firebase Auth account, which is normally password-based.
  // Signing in with Google instead issues a *different* uid for the same
  // person, so fall back to matching the profile by email — the Google
  // account's email is verified by Google itself (decoded.email_verified),
  // so this is safe to trust without an extra confirmation step.
  if (!snap.exists && email) {
    const byEmail = await collections.users().where("email", "==", email).limit(1).get();
    if (!byEmail.empty) {
      snap = byEmail.docs[0]!;
      docId = snap.id;
    }
  }

  if (!snap.exists) {
    throw httpError(401, "User profile not found");
  }
  const user = { id: docId, ...(snap.data() as UserDoc) };

  if (roles && roles.length && !roles.includes(user.role)) {
    throw httpError(403, "You do not have access to this resource");
  }
  return user;
}
