import { Role } from "@repo/shared";
import { useAuthStore, type AuthUser } from "~/stores/auth";
import { useSupabase } from "./useSupabase";

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// The school portal is for staff only.
const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.TEACHER];

export function useAuth() {
  const auth = useAuthStore();
  const api = useApi();
  const supabase = useSupabase();

  async function login(username: string, password: string) {
    // Express resolves username -> email and proxies to Supabase Auth,
    // returning its session tokens alongside the Prisma profile.
    const res = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    if (!ALLOWED_ROLES.includes(res.user.role)) {
      throw new Error(
        "This is the staff portal. Parents should sign in at the Parent Portal (http://localhost:3002).",
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
