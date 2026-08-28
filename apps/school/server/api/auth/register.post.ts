import { selfSignupSchema, Role } from "@repo/shared";
import type { SchoolDoc } from "../../utils/firebase";

/**
 * Public — no requireUser(). This is the landing page's "Get started" form:
 * submitting it creates a brand-new school (tenant) plus a real ADMIN
 * account for it immediately, so the person can sign in right away — no
 * platform-admin review step (that used to live at the now-removed
 * /signup-requests). A username is auto-generated from their name (staff
 * normally sign in with one — see useAuth.ts) so the form only has to ask
 * for what's actually needed: school name, contact name, email, phone,
 * password.
 */
export default defineEventHandler(async (event) => {
  const body = await validateBody(event, selfSignupSchema);

  const clash = await collections.users().where("email", "==", body.email).limit(1).get();
  if (!clash.empty) throw httpError(409, "An account with this email already exists.");

  const school: SchoolDoc = {
    name: body.schoolName,
    email: body.email,
    phone: body.phone ?? null,
    address: null,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };
  const schoolRef = await collections.schools().add(school);

  const username = await uniqueUsernameFrom(body.name);

  const created = await provisionUser({
    email: body.email,
    password: body.password,
    name: body.name,
    phone: body.phone,
    role: Role.ADMIN,
    username,
    schoolId: schoolRef.id,
  });

  setResponseStatus(event, 201);
  return { user: publicUser(created.id, created) };
});

/** Slugify a display name into a username, appending a number until it's unique. */
async function uniqueUsernameFrom(name: string): Promise<string> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".");
  let start = 0;
  let end = slug.length;
  while (start < end && slug[start] === ".") start++;
  while (end > start && slug[end - 1] === ".") end--;
  const base = slug.slice(start, end) || "admin";
  let candidate = base;
  for (let n = 2; ; n++) {
    const clash = await collections.users().where("username", "==", candidate).limit(1).get();
    if (clash.empty) return candidate;
    candidate = `${base}${n}`;
  }
}
