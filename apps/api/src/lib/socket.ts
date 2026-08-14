import { SocketEvents, userRoom } from "@repo/shared";
import { prisma } from "./prisma";
import { supabaseAdmin } from "./supabase";

/**
 * Push a real-time event to a single user via a Supabase Realtime broadcast
 * channel (replaces the old Socket.IO `emitTo`). `userRoom(userId)` still
 * names the channel, same as it named the Socket.IO room before — clients
 * subscribe to that same channel name (see apps/*/app/composables/useRealtime.ts).
 */
export function emitTo(userId: string, event: string, payload: unknown) {
  void supabaseAdmin.channel(userRoom(userId)).send({
    type: "broadcast",
    event,
    payload,
  });
}

/**
 * Persist a Notification row and push it to the user in real time. Reused
 * by every feature that alerts a user — signature unchanged from before the
 * Supabase migration, so none of its callers needed to change.
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
