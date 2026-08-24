import { useRealtime } from "~/composables/useRealtime";

// `$socket()` returns an object with the same `.on(event, handler)` shape
// the old Socket.IO client exposed (see useRealtime.ts for its current,
// no-op-for-now implementation) — pages that call `$socket()` need no changes.
export default defineNuxtPlugin(() => {
  return {
    provide: {
      socket: () => useRealtime(),
    },
  };
});
