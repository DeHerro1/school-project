import type { SchoolDoc } from "../../utils/firebase";

// Any signed-in ADMIN, TEACHER, or PARENT profile — role-based routing
// (staff dashboard vs. the parent pages under app/pages/parent/**) happens
// client-side in app/middleware/auth.global.ts.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const schoolSnap = await collections.schools().doc(user.schoolId).get();
  const schoolName = schoolSnap.exists ? (schoolSnap.data() as SchoolDoc).name : null;
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      schoolId: user.schoolId,
      schoolName,
    },
  };
});
