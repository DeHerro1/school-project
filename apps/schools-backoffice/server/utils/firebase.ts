import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { applicationDefault, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { MockFirestore } from "./mockFirestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Trimmed copy of apps/school/server/utils/firebase.ts — this app reads/writes
 * only its own `platformAdmins` collection (see server/api/platform-admins/**),
 * and uses Auth to verify platform-admin sign-ins and provision new admin
 * accounts — no Storage. Set GOOGLE_APPLICATION_CREDENTIALS to point this at
 * the same real Firebase project as apps/school (platform admins are a
 * separate Auth/Firestore concern from that app's ADMIN/TEACHER/PARENT users,
 * but sharing one project keeps local dev to a single emulator/service account).
 */
export const USE_REAL_FIREBASE = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

let app: App;

function getApp(): App {
  if (!app) {
    const config = useRuntimeConfig();
    const existing = getApps();
    app =
      existing[0] ??
      initializeApp({
        projectId: config.firebaseProjectId,
        ...(USE_REAL_FIREBASE ? { credential: applicationDefault() } : {}),
      });
  }
  return app;
}

export function adminAuth(): Auth {
  return getAuth(getApp());
}

let mockDb: MockFirestore | undefined;

export function adminDb(): Firestore {
  if (USE_REAL_FIREBASE) return getFirestore(getApp());
  // Same file apps/school's mock falls back to (resolved from repo root) —
  // mirrors sharing one real Firestore project in production.
  mockDb ??= new MockFirestore(resolve(__dirname, "../../../../.data/firestore.json"));
  return mockDb as unknown as Firestore;
}

// A schools-backoffice user, keyed by their Firebase Auth uid — the account
// that manages schools. Deliberately its own collection, not apps/school's
// `users`: platform admins aren't scoped to any one school and carry no
// ADMIN/TEACHER/PARENT role.
export interface PlatformAdminDoc {
  email: string;
  name: string;
  createdAt: string;
}

export const collections = {
  platformAdmins: () => adminDb().collection("platformAdmins"),
};
