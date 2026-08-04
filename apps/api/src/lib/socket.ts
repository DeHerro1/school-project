import { Server as IOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { SocketEvents, userRoom } from "@repo/shared";
import { env } from "./env";
import { prisma } from "./prisma";
import { verifyAccessToken } from "./jwt";

let io: IOServer | null = null;

export function initSocket(httpServer: HttpServer): IOServer {
  io = new IOServer(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  // Authenticate every connection using the access token.
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      socket.handshake.headers.authorization?.replace("Bearer ", "");
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(userRoom(userId));
  });

  return io;
}

/** Emit a raw event to a single user's room. */
export function emitTo(userId: string, event: string, payload: unknown) {
  io?.to(userRoom(userId)).emit(event, payload);
}

/**
 * Persist a Notification row and push it to the user in real time.
 * Reused by every feature that alerts a user.
 */
export async function notify(opts: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  const n = await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      data: opts.data as object | undefined,
    },
  });
  emitTo(opts.userId, SocketEvents.NOTIFICATION, {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? undefined,
    data: opts.data,
    createdAt: n.createdAt.toISOString(),
  });
  return n;
}
