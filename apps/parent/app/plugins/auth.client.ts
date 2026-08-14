import { useAuthStore, type AuthUser } from "~/stores/auth";
import { useSupabase } from "~/composables/useSupabase";

// Restore the cached profile before the app renders (fast path — avoids a
// flash to /login while the async session check below resolves), then
// reconcile it against the Supabase SDK's real session.
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();
  const supabase = useSupabase();
  const config = useRuntimeConfig();

  if (!auth.ready) auth.restore();

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    auth.clear();
  } else if (!auth.user || auth.user.id !== data.session.user.id) {
    // A live session exists but we have no matching cached profile (e.g.
    // first load on this device/browser) — fetch it from the API.
    try {
      const res = await $fetch<{ user: AuthUser }>("/auth/me", {
        baseURL: `${config.public.apiBase}/api`,
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      auth.setUser(res.user);
    } catch {
      auth.clear();
    }
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") auth.clear();
  });
});
