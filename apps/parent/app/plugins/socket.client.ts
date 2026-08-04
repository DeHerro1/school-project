// Real-time is disabled in front-end-only (mock) mode — there is no server to
// connect a Socket.IO client to. We still provide a `$socket` accessor so pages
// that reference it (e.g. messages.vue) keep working; it just returns null.
export default defineNuxtPlugin(() => {
  return {
    provide: {
      socket: () => null,
    },
  };
});
