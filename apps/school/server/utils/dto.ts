import type { UserDoc } from "./firebase";

/** Strips a user profile down to the fields safe to send to any staff client. */
export function publicUser(id: string, doc: UserDoc) {
  return {
    id,
    email: doc.email,
    username: doc.username,
    name: doc.name,
    role: doc.role,
    phone: doc.phone,
    avatarUrl: doc.avatarUrl,
    createdAt: doc.createdAt,
    schoolId: doc.schoolId,
  };
}
