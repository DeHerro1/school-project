import { defineStore } from "pinia";
import type { Role } from "@repo/shared";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  ready: boolean;
}

const STORAGE_KEY = "parent-auth";

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    ready: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.accessToken && !!s.user,
    role: (s) => s.user?.role ?? null,
  },
  actions: {
    persist() {
      if (import.meta.client) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            user: this.user,
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
            this.user = parsed.user;
            this.accessToken = parsed.accessToken;
            this.refreshToken = parsed.refreshToken;
          } catch {
            /* ignore */
          }
        }
      }
      this.ready = true;
    },
    setSession(payload: { user: AuthUser; accessToken: string; refreshToken: string }) {
      this.user = payload.user;
      this.accessToken = payload.accessToken;
      this.refreshToken = payload.refreshToken;
      this.persist();
    },
    clear() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
      if (import.meta.client) localStorage.removeItem(STORAGE_KEY);
    },
  },
});
