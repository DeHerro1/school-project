import type { NotificationDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const snap = await collections.notifications().where("userId", "==", user.id).get();
  const notifications = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as NotificationDoc) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
  const unread = notifications.filter((n) => !n.readAt).length;
  return { notifications, unread };
});
