import { useAuthStore } from "~/stores/auth";

// Restore the persisted session before the app renders.
export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  if (!auth.ready) auth.restore();
});
