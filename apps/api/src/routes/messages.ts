import { Router } from "express";
import { sendMessageSchema, Role, SocketEvents } from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import { notify, emitTo } from "../lib/socket";

export const messagesRouter = Router();

// People the current user may message (staff <-> parents)
messagesRouter.get(
  "/contacts",
  authGuard(),
  asyncHandler(async (req, res) => {
    const role = req.user!.role;
    const wanted =
      role === Role.PARENT
        ? [Role.TEACHER, Role.ADMIN]
        : role === Role.TEACHER
          ? [Role.PARENT, Role.ADMIN]
          : [Role.PARENT, Role.TEACHER, Role.ADMIN];
    const contacts = await prisma.user.findMany({
      where: { role: { in: wanted }, id: { not: req.user!.sub } },
      select: { id: true, name: true, role: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });
    res.json({ contacts });
  }),
);

// Conversation with another user; marks their messages to me as read
messagesRouter.get(
  "/",
  authGuard(),
  asyncHandler(async (req, res) => {
    const me = req.user!.sub;
    const withUserId = req.query.withUserId as string;
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: me, receiverId: withUserId },
          { senderId: withUserId, receiverId: me },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    await prisma.message.updateMany({
      where: { senderId: withUserId, receiverId: me, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ messages });
  }),
);

// Unread message count for the badge
messagesRouter.get(
  "/unread-count",
  authGuard(),
  asyncHandler(async (req, res) => {
    const count = await prisma.message.count({
      where: { receiverId: req.user!.sub, readAt: null },
    });
    res.json({ count });
  }),
);

messagesRouter.post(
  "/",
  authGuard(),
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await prisma.message.create({
      data: {
        senderId: req.user!.sub,
        receiverId: req.body.receiverId,
        body: req.body.body,
      },
    });
    emitTo(req.body.receiverId, SocketEvents.MESSAGE_NEW, message);
    await notify({
      userId: req.body.receiverId,
      type: "MESSAGE_NEW",
      title: `New message from ${req.user!.name}`,
      body: req.body.body.slice(0, 120),
      data: { fromUserId: req.user!.sub },
    });
    res.status(201).json({ message });
  }),
);
