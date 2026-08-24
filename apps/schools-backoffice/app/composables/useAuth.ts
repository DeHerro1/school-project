import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useAuthStore, type PlatformAdmin } from "~/stores/auth";
import { useFirebaseAuth } from "./useFirebase";
import { usePlatformAdminsApi } from "./usePlatformAdminsApi";

interface MeResponse {
  admin: PlatformAdmin;
}

export function useAuth() {
  const auth = useAuthStore();
  const firebaseAuth = useFirebaseAuth();
  const platformAdminsApi = usePlatformAdminsApi();

  async function login(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch {
      throw new Error("Invalid credentials");
    }

    // Firebase accepted the password, but that only proves this is *a* valid
    // account — /platform-admins/me additionally checks the platformAdmins
    // Firestore collection, so a non-admin Firebase account (or one removed
    // from the roster) is rejected here and signed back out.
    try {
      const res = await platformAdminsApi<MeResponse>("/me");
      auth.setAdmin(res.admin);
      return res.admin;
    } catch {
      await signOut(firebaseAuth);
      auth.clear();
      throw new Error("This account isn't a platform admin.");
    }
  }

  async function logout() {
    await signOut(firebaseAuth);
    auth.clear();
    await navigateTo("/login");
  }

  return { login, logout };
}
