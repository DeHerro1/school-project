// The signed-in platform admin's own profile — fetched right after Firebase
// sign-in (see app/composables/useAuth.ts) the same way apps/school's
// /api/auth/me backs its login flow.
export default defineEventHandler(async (event) => {
  const admin = await requirePlatformAdmin(event);
  return { admin };
});
