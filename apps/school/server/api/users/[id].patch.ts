import { updateUserSchema, Role } from "@repo/shared";
import type { UserDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN]);
  const id = getRouterParam(event, "id")!;
  const body = await validateBody(event, updateUserSchema);

  const ref = collections.users().doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw httpError(404, "User not found");

  if (body.password) {
    try {
      await adminAuth().updateUser(id, { password: body.password });
    } catch (e) {
      throw httpError(400, e instanceof Error ? e.message : "Could not update password");
    }
  }

  const patch: Partial<UserDoc> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.phone !== undefined) patch.phone = body.phone;
  if (Object.keys(patch).length) await ref.update(patch);

  const updated = await ref.get();
  return { user: publicUser(id, updated.data() as UserDoc) };
});
