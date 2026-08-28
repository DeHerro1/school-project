import { Role } from "@repo/shared";
import type { UserDoc } from "../../utils/firebase";

// List users, optionally filtered by role (?role=TEACHER)
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, [Role.ADMIN]);
  const query = getQuery(event);
  const role = typeof query.role === "string" ? query.role : undefined;

  let ref = collections.users().where("schoolId", "==", admin.schoolId) as FirebaseFirestore.Query;
  if (role) ref = ref.where("role", "==", role);
  const snap = await ref.get();

  // Sorted in memory rather than via Firestore's orderBy(): combining an
  // equality filter (role) with orderBy on a different field (createdAt)
  // needs a composite index on real Firestore that isn't deployed — this
  // collection is small enough (one school's staff/parents) that sorting
  // here avoids depending on one. (MockFirestore, used without a real
  // project, doesn't enforce this, which is why this only broke once
  // GOOGLE_APPLICATION_CREDENTIALS pointed the app at a real project.)
  const users = snap.docs
    .map((d) => publicUser(d.id, d.data() as UserDoc))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return { users };
});
