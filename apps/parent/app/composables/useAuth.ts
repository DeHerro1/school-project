import { Role } from "@repo/shared";
import { useAuthStore, type AuthUser } from "~/stores/auth";

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

  async function login(email: string, password: string) {
    const res = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (!ALLOWED_ROLES.includes(res.user.role)) {
      auth.clear();
      throw new Error(
        "This is the Parent Portal. Staff should sign in at the School Portal (http://localhost:3000).",
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
