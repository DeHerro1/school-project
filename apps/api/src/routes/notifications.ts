import { Router } from "express";
import { authGuard } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { prisma } from "../lib/prisma";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/",
  authGuard(),
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unread = notifications.filter((n) => !n.readAt).length;
    res.json({ notifications, unread });
  }),
);

notificationsRouter.post(
  "/read-all",
  authGuard(),
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, readAt: null },
      data: { readAt: new Date() },
    });
    res.status(204).end();
  }),
);

notificationsRouter.post(
  "/:id/read",
  authGuard(),
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.sub },
      data: { readAt: new Date() },
    });
    res.status(204).end();
  }),
);
