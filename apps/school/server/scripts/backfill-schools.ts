// One-time migration for data created before schools (multi-tenancy) existed
// in this app: every user/class/subject/student/invoice record that predates
// the schoolId field gets one, so existing accounts keep working instead of
// hitting "Cannot use 'undefined' as a Firestore value (found in field
// 'schoolId')" the first time they try to create something.
//
// One school per orphaned ADMIN — not one shared tenant for everyone missing
// a schoolId. Merging unrelated admins into a single school previously let
// one admin's classes/students show up for another admin entirely; this
// keeps every admin's data (and the school they own) separate from the
// start, matching how server/api/** already scopes everything by schoolId.
//
// Safe to run more than once — anything that already has a schoolId is left
// untouched.
//
// Run against whichever backend server/utils/firebase.ts would use:
//   pnpm --filter school backfill:schools
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { MockFirestore } from "../utils/mockFirestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../../.env") });
loadEnv({ path: resolve(__dirname, "../../.env"), override: true });

const USE_REAL_FIREBASE = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

const app = initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID ?? "school-project-dev",
  ...(USE_REAL_FIREBASE ? { credential: applicationDefault() } : {}),
});

// Same backend server/utils/firebase.ts's adminDb() would pick: the real
// project when GOOGLE_APPLICATION_CREDENTIALS is set, otherwise the local
// file-persisted mock (shared with schools-backoffice — see firebase.ts).
// Typed `any`: the real and mock Firestore clients are structurally close
// enough to share this script's logic, but not close enough to unify cleanly.
const db: any = USE_REAL_FIREBASE
  ? getFirestore(app)
  : new MockFirestore(resolve(__dirname, "../../../../.data/firestore.json"));

interface OrphanAdmin {
  id: string;
  name: string;
  email: string;
  schoolId: string;
}

/** Give each orphaned ADMIN their own brand-new school; return their ids. */
async function createSchoolsForOrphanedAdmins(): Promise<OrphanAdmin[]> {
  const usersSnap = await db.collection("users").get();
  const orphanedAdmins = usersSnap.docs.filter(
    (d: any) => d.data().role === "ADMIN" && d.data().schoolId === undefined,
  );
  if (orphanedAdmins.length === 0) {
    console.log("users: no orphaned ADMIN accounts — nothing to create");
    return [];
  }

  const result: OrphanAdmin[] = [];
  for (const doc of orphanedAdmins) {
    const admin = doc.data() as { name: string; email: string };
    const schoolRef = await db.collection("schools").add({
      name: `${admin.name}'s School`,
      email: admin.email,
      phone: null,
      address: null,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    });
    await doc.ref.update({ schoolId: schoolRef.id });
    console.log(`Created "${admin.name}'s School" -> ${schoolRef.id} for ${admin.email}`);
    result.push({ id: doc.id, name: admin.name, email: admin.email, schoolId: schoolRef.id });
  }
  return result;
}

/**
 * Orphaned non-admin users and orphaned data records predate schoolId
 * entirely, so there's nothing on the record itself saying which admin's
 * school they belong to. If exactly one admin was just backfilled, this was
 * a single-tenant app before migration — everything orphaned is safely
 * theirs. With more than one, attaching it to either would silently merge
 * their data (the exact bug this script caused before), so it stops and
 * asks for a manual call instead.
 */
async function attachRemainingOrphans(admins: OrphanAdmin[]) {
  if (admins.length === 0) return;
  if (admins.length > 1) {
    console.warn(
      `\n${admins.length} orphaned admins found (${admins.map((a) => a.email).join(", ")}) — ` +
        "each got their own new school above, but any other orphaned users/classes/subjects/" +
        "students/invoices were left untouched since it's not knowable which admin they belong " +
        "to. Assign their schoolId by hand (e.g. via the Firestore console).",
    );
    return;
  }
  const schoolId = admins[0]!.schoolId;

  for (const name of ["users", "classes", "subjects", "students", "invoices"]) {
    const snap = await db.collection(name).get();
    const missing = snap.docs.filter((d: any) => d.data().schoolId === undefined);
    if (missing.length === 0) {
      console.log(`${name}: nothing to backfill (${snap.docs.length} docs already fine)`);
      continue;
    }
    // Firestore batches cap at 500 writes; chunk accordingly.
    for (let i = 0; i < missing.length; i += 500) {
      const chunk = missing.slice(i, i + 500);
      const batch = db.batch();
      for (const doc of chunk) batch.update(doc.ref, { schoolId });
      await batch.commit();
    }
    console.log(`${name}: backfilled ${missing.length} of ${snap.docs.length} docs -> ${schoolId}`);
  }
}

async function main() {
  console.log(`Backend: ${USE_REAL_FIREBASE ? "real Firestore" : "local mock"}`);
  const admins = await createSchoolsForOrphanedAdmins();
  await attachRemainingOrphans(admins);
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
