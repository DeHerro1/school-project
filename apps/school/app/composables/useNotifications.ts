export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export function useNotifications() {
  const items = useState<AppNotification[]>("notifications", () => []);
  const unread = useState<number>("notifications-unread", () => 0);

  async function load() {
    const api = useApi();
    try {
      const res = await api<{ notifications: AppNotification[]; unread: number }>(
        "/notifications",
      );
      items.value = res.notifications;
      unread.value = res.unread;
    } catch {
      /* ignore */
    }
  }

  function prepend(n: AppNotification) {
    items.value = [n, ...items.value];
    unread.value += 1;
  }

  async function markAllRead() {
    const api = useApi();
    await api("/notifications/read-all", { method: "POST" });
    items.value = items.value.map((n) => ({ ...n, readAt: new Date().toISOString() }));
    unread.value = 0;
  }

  return { items, unread, load, prepend, markAllRead };
}
