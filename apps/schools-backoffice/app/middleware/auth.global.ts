import { useAuthStore } from "~/stores/auth";

const PUBLIC_ROUTES = ["/login"];

// Every route but /login requires a signed-in platform admin.
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (!auth.ready) auth.restore();

  const isPublic = PUBLIC_ROUTES.includes(to.path);

  if (!auth.isAuthenticated) {
    return isPublic ? undefined : navigateTo("/login");
  }

  if (isPublic) return navigateTo("/");
});
