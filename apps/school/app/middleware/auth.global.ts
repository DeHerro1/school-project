import { useAuthStore } from "~/stores/auth";
import { Role } from "@repo/shared";

const PUBLIC_ROUTES = ["/login"];

// School portal is for staff only (ADMIN + TEACHER).
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (!auth.ready) auth.restore();

  const isPublic = PUBLIC_ROUTES.includes(to.path);

  if (!auth.isAuthenticated) {
    return isPublic ? undefined : navigateTo("/login");
  }

  // Logged in but role not allowed here
  if (auth.role === Role.PARENT) {
    auth.clear();
    return navigateTo("/login");
  }

  if (isPublic) return navigateTo("/");
});
