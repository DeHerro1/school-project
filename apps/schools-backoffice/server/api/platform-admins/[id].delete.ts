// Remove a platform admin's access. Guards against locking everyone out:
// an admin can't remove themselves, and the last remaining admin can't be
// removed by anyone.
export default defineEventHandler(async (event) => {
  const requester = await requirePlatformAdmin(event);
  const id = getRouterParam(event, "id")!;

  if (id === requester.id) {
    throw httpError(400, "You cannot remove your own admin access.");
  }

  const ref = collections.platformAdmins().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw httpError(404, "Admin not found");

  const countSnap = await collections.platformAdmins().count().get();
  if (countSnap.data().count <= 1) {
    throw httpError(400, "At least one platform admin must remain.");
  }

  await ref.delete();
  try {
    await adminAuth().deleteUser(id);
  } catch (e) {
    // Firestore doc is already gone (the source of truth for access), so
    // leaving a stray Auth account behind fails safe — surface it but don't
    // roll back the deletion.
    console.error(`platform-admins.delete: failed to delete Firebase Auth user ${id}`, e);
  }

  return { ok: true };
});
