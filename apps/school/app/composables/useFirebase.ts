import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let emulatorConnected = false;

/**
 * Browser-side Firebase client — Auth only. Firestore/Storage reads and
 * writes all go through server/api/** (Admin SDK); the client SDK's job is
 * just to sign in and hand out ID tokens (see useApi.ts), the same role
 * Supabase's client SDK played before.
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
