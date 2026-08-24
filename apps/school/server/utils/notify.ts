import type { NotificationDoc } from "./firebase";

/**
 * Persist a notification for a user. Ported from apps/api/src/lib/socket.ts's
 * `notify()`, minus the real-time push (Socket.IO, then a Supabase Realtime
 * broadcast) — this pass writes the Firestore record only; the dashboard/
 * alerts pages pick it up on load. Live push (Firestore listeners) is a
 * follow-up once the parent-facing surface is back in scope.
 */
export async function notify(opts: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  const doc: NotificationDoc = {
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    data: opts.data ?? null,
    readAt: null,
    createdAt: new Date().toISOString(),
  };
  const ref = await collections.notifications().add(doc);
  return { id: ref.id, ...doc };
}
