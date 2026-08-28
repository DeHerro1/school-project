import { createUserSchema, Role } from "@repo/shared";

// Admin creates staff or parent accounts
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, [Role.ADMIN]);
  const body = await validateBody(event, createUserSchema);

  if (body.username) {
    const clash = await collections.users().where("username", "==", body.username).limit(1).get();
    if (!clash.empty) throw httpError(409, "A record with these details already exists.");
  }

  const created = await provisionUser({ ...body, schoolId: admin.schoolId });
  setResponseStatus(event, 201);
  return { user: publicUser(created.id, created) };
});
