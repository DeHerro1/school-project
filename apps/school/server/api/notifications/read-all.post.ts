export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const snap = await collections.notifications().where("userId", "==", user.id).where("readAt", "==", null).get();
  const db = adminDb();
  const batch = db.batch();
  const readAt = new Date().toISOString();
  snap.docs.forEach((d) => batch.update(d.ref, { readAt }));
  await batch.commit();
  setResponseStatus(event, 204);
  return null;
});
