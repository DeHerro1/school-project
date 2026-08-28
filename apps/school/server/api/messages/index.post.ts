import { sendMessageSchema, Role } from "@repo/shared";
import type { MessageDoc, UserDoc } from "../../utils/firebase";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await validateBody(event, sendMessageSchema);

  const receiverSnap = await collections.users().doc(body.receiverId).get();
  const receiver = receiverSnap.exists ? (receiverSnap.data() as UserDoc) : null;
  if (!receiver || receiver.schoolId !== user.schoolId) throw httpError(404, "Recipient not found");

  // Parents and teachers can only message the same people the contacts list
  // (see messages/contacts.get.ts) shows them — their children's homeroom
  // teacher(s)/their homeroom's parents, plus the headmaster(s). Admins can
  // message anyone at the school (already covered by the schoolId check above).
  if (user.role === Role.PARENT || user.role === Role.TEACHER) {
    const allowed =
      user.role === Role.PARENT
        ? await parentContactIds(user.id, user.schoolId)
        : await teacherContactIds(user.id, user.schoolId);
    if (!allowed.includes(body.receiverId)) throw httpError(404, "Recipient not found");
  }

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
