import { Role } from "@repo/shared";
import { useAuthStore, type AuthUser } from "~/stores/auth";
import { useSupabase } from "./useSupabase";

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// The parent portal is for parents only.
const ALLOWED_ROLES: Role[] = [Role.PARENT];

export function useAuth() {
  const auth = useAuthStore();
  const api = useApi();
  const supabase = useSupabase();

  async function login(email: string, password: string) {
    const res = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (!ALLOWED_ROLES.includes(res.user.role)) {
      throw new Error(
        "This is the Parent Portal. Staff should sign in at the School Portal (http://localhost:3000).",
      );
    }
    // Hand the session to the Supabase SDK so it owns persistence/auto-refresh from here on.
    await supabase.auth.setSession({ access_token: res.accessToken, refresh_token: res.refreshToken });
    auth.setUser(res.user);
    return res.user;
  }

  async function logout() {
    await supabase.auth.signOut();
    auth.clear();
    await navigateTo("/login");
  }

  return { login, logout };
}
