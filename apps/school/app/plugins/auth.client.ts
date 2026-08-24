import { onAuthStateChanged } from "firebase/auth";
import { useAuthStore, type AuthUser } from "~/stores/auth";
import { useFirebaseAuth } from "~/composables/useFirebase";

// Restore the cached profile before the app renders (fast path — avoids a
// flash to /login while the async session check below resolves), then
// reconcile it against Firebase Auth's real session.
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();
  const firebaseAuth = useFirebaseAuth();
  const api = useApi();

  if (!auth.ready) auth.restore();

  // waitForAuth resolves once Firebase Auth has restored (or found no)
  // persisted session — firebaseAuth.currentUser is null until then.
  const firebaseUser = await new Promise<import("firebase/auth").User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

  if (!firebaseUser) {
    auth.clear();
  } else if (!auth.user || auth.user.id !== firebaseUser.uid) {
    // A live session exists but we have no matching cached profile (e.g.
    // first load on this device/browser) — fetch it from the server.
    try {
      const res = await api<{ user: AuthUser }>("/auth/me");
      auth.setUser(res.user);
    } catch {
      auth.clear();
    }
  }

  onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) auth.clear();
  });
});
