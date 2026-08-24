import { useAuthStore } from "~/stores/auth";
import { Role } from "@repo/shared";

// "/" is the public marketing landing page (see app/pages/index.vue). Staff
// (ADMIN/TEACHER) live under "/dashboard" and friends; parents live under
// "/parent" — each role is fenced out of the other's routes below.
const PUBLIC_ROUTES = ["/", "/login"];

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (!auth.ready) auth.restore();

  const isPublic = PUBLIC_ROUTES.includes(to.path);

  if (!auth.isAuthenticated) {
    return isPublic ? undefined : navigateTo("/login");
  }

  const isParentRoute = to.path === "/parent" || to.path.startsWith("/parent/");

  if (auth.role === Role.PARENT) {
    // Parents only ever see "/parent/**".
    if (!isParentRoute) return navigateTo("/parent");
    return;
  }

  // Staff (ADMIN/TEACHER) never see the parent pages or the public routes.
  if (isParentRoute) return navigateTo("/dashboard");
  if (isPublic) return navigateTo("/dashboard");
});
