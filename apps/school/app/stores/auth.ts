import { defineStore } from "pinia";
import type { Role } from "@repo/shared";

export interface AuthUser {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  role: Role;
  phone?: string | null;
  avatarUrl?: string | null;
  schoolId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  ready: boolean;
}

// Caches the profile only — the Firebase Auth SDK (see useFirebase.ts) owns
// the actual session/token lifecycle (persistence, auto-refresh) in its own
// storage. This cache just avoids a network round trip to re-fetch the
// profile on every page load; auth.client.ts reconciles it against the
// SDK's real session on startup.
const STORAGE_KEY = "school-auth";

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    ready: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.user,
    role: (s) => s.user?.role ?? null,
  },
  actions: {
    persist() {
      if (import.meta.client) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: this.user }));
      }
    },
    restore() {
      if (import.meta.client) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            this.user = JSON.parse(raw).user ?? null;
          } catch {
            /* ignore */
          }
        }
      }
      this.ready = true;
    },
    setUser(user: AuthUser) {
      this.user = user;
      this.persist();
    },
    clear() {
      this.user = null;
      if (import.meta.client) localStorage.removeItem(STORAGE_KEY);
    },
  },
});
