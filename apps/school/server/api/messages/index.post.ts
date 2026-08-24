import { sendMessageSchema } from "@repo/shared";
import type { MessageDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await validateBody(event, sendMessageSchema);

  const doc: MessageDoc = {
    senderId: user.id,
    receiverId: body.receiverId,
    body: body.body,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  const id = newId();
  await collections.messages().doc(id).set(doc);

  await notify({
    userId: body.receiverId,
    type: "MESSAGE_NEW",
    title: `New message from ${user.name}`,
    body: body.body.slice(0, 120),
    data: { fromUserId: user.id },
  });

  setResponseStatus(event, 201);
  return { message: { id, ...doc } };
});
