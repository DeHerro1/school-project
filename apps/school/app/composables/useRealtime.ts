import type { RealtimeChannel } from "@supabase/supabase-js";
import { userRoom } from "@repo/shared";
import { useAuthStore } from "~/stores/auth";
import { useSupabase } from "./useSupabase";

let channel: RealtimeChannel | null = null;
let channelUserId: string | null = null;

/** The shared per-user broadcast channel (one per session), created lazily
 * and reused across every `on()` call — replaces the Socket.IO connection. */
function realtimeChannel(): RealtimeChannel | null {
  const auth = useAuthStore();
  const supabase = useSupabase();
  if (!auth.user) return null;
  if (!channel || channelUserId !== auth.user.id) {
    if (channel) supabase.removeChannel(channel);
    channelUserId = auth.user.id;
    channel = supabase.channel(userRoom(auth.user.id)).subscribe();
  }
  return channel;
}

/** Subscribe to a real-time event for the current user. Mirrors the old
 * `socket.on(event, handler)` call shape so pages barely changed. */
export function useRealtime() {
  function on(event: string, handler: (payload: any) => void) {
    const ch = realtimeChannel();
    ch?.on("broadcast", { event }, ({ payload }: { payload: any }) => handler(payload));
  }
  return { on };
}
