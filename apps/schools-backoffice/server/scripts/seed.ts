// Seeds the first platform admin — there's no self-signup route for
// server/api/platform-admins/** on purpose (see its comment), so this is how
// the very first account gets in; every admin after that is added from the
// app's own Admins page by someone already signed in. Run against the
// Firebase Auth Emulator (for the account) + the local Node-only Firestore
// mock (for the profile) — see apps/school/server/utils/mockFirestore.ts,
// shared with this app's own server/utils/firebase.ts.
//   pnpm firebase:emulators   (in one terminal)
//   pnpm --filter schools-backoffice run seed:firebase   (in another)
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { MockFirestore } from "../utils/mockFirestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../../.env") });
loadEnv({ path: resolve(__dirname, "../../.env"), override: true });

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    "FIREBASE_AUTH_EMULATOR_HOST is not set — refusing to seed a real Firebase project.\n" +
      "Start the emulator first: pnpm firebase:emulators",
  );
  process.exit(1);
}

const app = initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID ?? "school-project-dev",
  // Omitted entirely (not just `undefined`) when there's no real project —
  // firebase-admin rejects an explicit `credential: undefined` key.
  ...(process.env.GOOGLE_APPLICATION_CREDENTIALS ? { credential: applicationDefault() } : {}),
});
const auth = getAuth(app);
// Same file apps/school's mock falls back to — see this app's own
// server/utils/firebase.ts.
const db = new MockFirestore(resolve(__dirname, "../../../../.data/firestore.json"));

async function seedPlatformAdmin(opts: { email: string; password: string; name: string }) {
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(opts.email);
    uid = existing.uid;
    await auth.updateUser(uid, { password: opts.password, displayName: opts.name });
  } catch {
    const created = await auth.createUser({
      email: opts.email,
      password: opts.password,
      displayName: opts.name,
      emailVerified: true,
    });
    uid = created.uid;
  }
  await db.collection("platformAdmins").doc(uid).set({
    email: opts.email,
    name: opts.name,
    createdAt: new Date().toISOString(),
  });
  console.log(`  platform admin ${opts.email} -> ${uid}`);
  return uid;
}

async function main() {
  console.log("Seeding schools-backoffice platform admin...");
  await seedPlatformAdmin({
    email: "owner@backoffice.test",
    password: "password123",
    name: "Platform Owner",
  });
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
