import { useAuthStore, type PlatformAdmin } from "~/stores/auth";

interface AuthResponse {
  admin: PlatformAdmin;
  accessToken: string;
  refreshToken: string;
}

export function useAuth() {
  const auth = useAuthStore();
  const api = useApi();

  async function login(email: string, password: string) {
    const res = await api<AuthResponse>("/platform/auth/login", {
      method: "POST",
      body: { email, password },
    });
    auth.setSession(res);
    return res.admin;
  }

  async function logout() {
    try {
      if (auth.refreshToken) {
        await api("/platform/auth/logout", {
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
