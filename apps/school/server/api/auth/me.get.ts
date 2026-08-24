// Any signed-in ADMIN, TEACHER, or PARENT profile — role-based routing
// (staff dashboard vs. the parent pages under app/pages/parent/**) happens
// client-side in app/middleware/auth.global.ts.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    },
  };
});
