/**
 * Real-time event subscription — a no-op for now. The Express + Socket.IO
 * push (then a Supabase Realtime broadcast) isn't ported yet; `notify()`
 * (server/utils/notify.ts) still persists every notification, so nothing
 * is lost, it just doesn't show up live — the bell/alerts lists pick new
 * ones up on next load/poll. Swap this for a Firestore `onSnapshot`
 * listener (scoped by a security rule to the signed-in user's own
 * `notifications`) when live push comes back into scope.
 */
export function useRealtime() {
  function on(_event: string, _handler: (payload: any) => void) {
    // intentionally empty
  }
  return { on };
}
