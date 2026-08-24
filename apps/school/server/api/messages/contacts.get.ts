import { Role } from "@repo/shared";
import type { UserDoc } from "../../utils/firebase";

// People the current user may message — staff <-> parents, staff <-> staff.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const wanted: string[] =
    user.role === Role.PARENT
      ? [Role.TEACHER, Role.ADMIN]
      : user.role === Role.TEACHER
        ? [Role.PARENT, Role.ADMIN]
        : [Role.PARENT, Role.TEACHER, Role.ADMIN];

  const snap = await collections.users().where("role", "in", wanted).get();
  const contacts = snap.docs
    .filter((d) => d.id !== user.id)
    .map((d) => {
      const u = d.data() as UserDoc;
      return { id: d.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { contacts };
});
