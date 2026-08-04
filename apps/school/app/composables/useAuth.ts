import { Role } from "@repo/shared";
import { useAuthStore, type AuthUser } from "~/stores/auth";

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

  async function login(username: string, password: string) {
    const res = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    if (!ALLOWED_ROLES.includes(res.user.role)) {
      auth.clear();
      throw new Error(
        "This is the staff portal. Parents should sign in at the Parent Portal (http://localhost:3002).",
      );
    }
    auth.setSession(res);
    return res.user;
  }

  async function logout() {
    try {
      if (auth.refreshToken) {
        await api("/auth/logout", {
          method: "POST",
          body: { refreshToken: auth.refreshToken },
        });
      }
    } finally {
      auth.clear();
      await navigateTo("/login");
    }
  }

  return { login, logout };
}
