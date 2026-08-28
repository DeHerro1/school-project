import { Role } from "@repo/shared";
import type { UserDoc } from "../../utils/firebase";

// People the current user may message:
//  - Parents: only their children's homeroom teacher(s) + the headmaster(s).
//  - Teachers: only the parents of their homeroom class(es) + the headmaster(s).
//  - Admins (headmaster): every staff member and parent at the school.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);

  let contactIds: string[] | null = null;
  if (user.role === Role.PARENT) {
    contactIds = await parentContactIds(user.id, user.schoolId);
  } else if (user.role === Role.TEACHER) {
    contactIds = await teacherContactIds(user.id, user.schoolId);
  }

  let contacts: { id: string; name: string; role: string; avatarUrl: string | null }[];
  if (contactIds) {
    const ids = [...new Set(contactIds)];
    const docs = ids.length ? await adminDb().getAll(...ids.map((id) => collections.users().doc(id))) : [];
    contacts = docs
      .filter((d) => d.exists && d.id !== user.id)
      .map((d) => {
        const u = d.data() as UserDoc;
        return { id: d.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl };
      });
  } else {
    // Admins (headmaster): the whole school, staff and parents alike.
    // Filtered to the caller's own school in memory rather than via a second
    // where() — combining "in" with an equality filter on a different field
    // needs a composite index on real Firestore that isn't deployed (see
    // users/index.get.ts).
    const snap = await collections.users().where("role", "in", [Role.PARENT, Role.TEACHER, Role.ADMIN]).get();
    contacts = snap.docs
      .filter((d) => d.id !== user.id && (d.data() as UserDoc).schoolId === user.schoolId)
      .map((d) => {
        const u = d.data() as UserDoc;
        return { id: d.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl };
      });
  }

  contacts.sort((a, b) => a.name.localeCompare(b.name));
  return { contacts };
});
