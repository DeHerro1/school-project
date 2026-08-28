import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { useAuthStore, type AuthUser } from "~/stores/auth";
import { useFirebaseAuth } from "./useFirebase";

interface MeResponse {
  user: AuthUser;
}

// Staff sign in with a username; parents sign in with their email — both
// land here, and app/middleware/auth.global.ts routes them by role
// afterwards (staff dashboard vs. the parent pages).
export function useAuth() {
  const auth = useAuthStore();
  const api = useApi();
  const firebaseAuth = useFirebaseAuth();

  async function login(usernameOrEmail: string, password: string) {
    // Firebase Auth's password sign-in only accepts an email. Staff sign in
    // with a username and need it resolved first; parents already type
    // their email, so that round trip is skipped for them.
    const email = usernameOrEmail.includes("@")
      ? usernameOrEmail
      : (
          await api<{ email: string }>(
            `/auth/resolve-username?username=${encodeURIComponent(usernameOrEmail)}`,
          )
        ).email;

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch {
      throw new Error("Invalid credentials");
    }

    return finishLogin("Invalid credentials");
  }

  /** Returns `null` if the user dismissed the Google popup — not an error worth surfacing. */
  async function loginWithGoogle(): Promise<AuthUser | null> {
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return null;
      }
      throw new Error("Google sign-in failed");
    }

    return finishLogin("This Google account isn't registered here. Ask an admin to add you.");
  }

  // Shared by both sign-in methods: fetch the Firestore profile (also
  // enforces the role check server-side, see server/api/auth/me.get.ts), or
  // roll back the Firebase Auth session.
  async function finishLogin(notRegisteredMessage: string): Promise<AuthUser> {
    try {
      const res = await api<MeResponse>("/auth/me");
      auth.setUser(res.user);
      return res.user;
    } catch (e) {
      await signOut(firebaseAuth);
      auth.clear();
      // requireUser() only fails with 401 when there's genuinely no matching
      // profile (see server/utils/auth.ts) — that's the friendly
      // "not registered" case below. Any other failure (e.g. a 409 for an
      // account that exists but isn't linked to a school yet) is real and
      // actionable, so show it as-is instead of masking it behind that message.
      const status = (e as { status?: number })?.status;
      throw new Error(status === 401 ? notRegisteredMessage : apiError(e));
    }
  }

  async function logout() {
    await signOut(firebaseAuth);
    auth.clear();
    await navigateTo("/");
  }

  return { login, loginWithGoogle, logout };
}
