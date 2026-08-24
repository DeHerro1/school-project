import { defineStore } from "pinia";

// Platform admins are a separate account model from the school/parent portals'
// ADMIN/TEACHER/PARENT users — no shared login, no shared Role enum. `id` is
// the admin's Firebase Auth uid, same as school/parent user ids.
export interface PlatformAdmin {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthState {
  admin: PlatformAdmin | null;
  ready: boolean;
}

// Caches the profile only — the Firebase Auth SDK (see useFirebase.ts) owns
// the actual session/token lifecycle (persistence, auto-refresh) in its own
// storage. This cache just avoids a network round trip to re-fetch the
// profile on every page load; plugins/auth.client.ts reconciles it against
// the SDK's real session on startup.
const STORAGE_KEY = "backoffice-auth";

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    admin: null,
    ready: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.admin,
  },
  actions: {
    persist() {
      if (import.meta.client) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ admin: this.admin }));
      }
    },
    restore() {
      if (import.meta.client) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            this.admin = JSON.parse(raw).admin ?? null;
          } catch {
            /* ignore */
          }
        }
      }
      this.ready = true;
    },
    setAdmin(admin: PlatformAdmin) {
      this.admin = admin;
      this.persist();
    },
    clear() {
      this.admin = null;
      if (import.meta.client) localStorage.removeItem(STORAGE_KEY);
    },
  },
});
