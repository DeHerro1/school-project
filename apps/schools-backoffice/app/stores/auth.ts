import { defineStore } from "pinia";

// Platform admins are a separate account model from the school/parent portals'
// ADMIN/TEACHER/PARENT users — no shared login, no shared Role enum.
export interface PlatformAdmin {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthState {
  admin: PlatformAdmin | null;
  accessToken: string | null;
  refreshToken: string | null;
  ready: boolean;
}

const STORAGE_KEY = "backoffice-auth";

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    admin: null,
    accessToken: null,
    refreshToken: null,
    ready: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.accessToken && !!s.admin,
  },
  actions: {
    persist() {
      if (import.meta.client) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            admin: this.admin,
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
          }),
        );
      }
    },
    restore() {
      if (import.meta.client) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            this.admin = parsed.admin;
            this.accessToken = parsed.accessToken;
            this.refreshToken = parsed.refreshToken;
          } catch {
            /* ignore */
          }
        }
      }
      this.ready = true;
    },
    setSession(payload: { admin: PlatformAdmin; accessToken: string; refreshToken: string }) {
      this.admin = payload.admin;
      this.accessToken = payload.accessToken;
      this.refreshToken = payload.refreshToken;
      this.persist();
    },
    clear() {
      this.admin = null;
      this.accessToken = null;
      this.refreshToken = null;
      if (import.meta.client) localStorage.removeItem(STORAGE_KEY);
    },
  },
});
