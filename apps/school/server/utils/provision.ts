import type { Role } from "@repo/shared";
import type { UserDoc } from "./firebase";

export interface ProvisionUserInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: Role;
  username?: string | null;
  schoolId: string;
}

/**
 * The single place that creates a "user" for this app — creates the Firebase
 * Auth account, then its Firestore `users/{uid}` profile, so the two never
 * desync (an Auth account without a profile row breaks login /
 * requireUser() lookups). Ported from apps/api/src/lib/provisionUser.ts.
 *
 * No cross-system transaction exists, so on a Firestore failure the
 * just-created Auth user is rolled back (best-effort).
 */
export async function provisionUser(input: ProvisionUserInput): Promise<{ id: string } & UserDoc> {
  let uid: string;
  try {
    const created = await adminAuth().createUser({
      email: input.email,
      password: input.password,
      displayName: input.name,
      emailVerified: true, // no email-confirmation round trip needed for this project
    });
    uid = created.uid;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create account";
    throw httpError(400, message);
  }

  const doc: UserDoc = {
    email: input.email,
    username: input.username || null,
    name: input.name,
    role: input.role,
    phone: input.phone ?? null,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    schoolId: input.schoolId,
  };

  try {
    await collections.users().doc(uid).set(doc);
    return { id: uid, ...doc };
  } catch (err) {
    try {
      await adminAuth().deleteUser(uid);
    } catch (cleanupError) {
      console.error(
        `provisionUser: failed to roll back orphaned Firebase Auth user ${uid} after Firestore write failure`,
        cleanupError,
      );
    }
    throw err;
  }
}
