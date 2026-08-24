import type { MessageDoc } from "../../utils/firebase";

// Conversation between the current user and `withUserId`; marks their
// messages to me as read.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const query = getQuery(event);
  const withUserId = typeof query.withUserId === "string" ? query.withUserId : undefined;
  if (!withUserId) throw httpError(400, "withUserId is required");

  const [sent, received] = await Promise.all([
    collections.messages().where("senderId", "==", user.id).where("receiverId", "==", withUserId).get(),
    collections.messages().where("senderId", "==", withUserId).where("receiverId", "==", user.id).get(),
  ]);
  const messages = [...sent.docs, ...received.docs]
    .map((d) => ({ id: d.id, ...(d.data() as MessageDoc) }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-200);

  const unread = received.docs.filter((d) => !(d.data() as MessageDoc).readAt);
  await Promise.all(unread.map((d) => d.ref.update({ readAt: new Date().toISOString() })));

  return { messages };
});
