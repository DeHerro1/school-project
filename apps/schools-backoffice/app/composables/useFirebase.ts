import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let emulatorConnected = false;

/**
 * Browser-side Firebase client — Auth only, same role as apps/school's
 * useFirebase.ts. Firestore reads/writes for platform admins go through
 * server/api/platform-admins/** (Admin SDK); this just signs in and hands out
 * ID tokens (see useApi.ts). Points at the same Firebase project as
 * apps/school (see server/utils/firebase.ts), so it reuses that app's
 * NUXT_PUBLIC_FIREBASE_* / FIREBASE_AUTH_EMULATOR_HOST env vars rather than
 * needing a second set.
 */
export function useFirebaseAuth(): Auth {
  if (!auth) {
    const config = useRuntimeConfig();
    app =
      getApps()[0] ??
      initializeApp({
        apiKey: config.public.firebaseApiKey,
        projectId: config.public.firebaseProjectId,
        appId: config.public.firebaseAppId,
        authDomain: `${config.public.firebaseProjectId}.firebaseapp.com`,
      });
    auth = getAuth(app);
    if (config.public.firebaseAuthEmulatorHost && !emulatorConnected) {
      connectAuthEmulator(auth, `http://${config.public.firebaseAuthEmulatorHost}`, {
        disableWarnings: true,
      });
      emulatorConnected = true;
    }
  }
  return auth;
}
