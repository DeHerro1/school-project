// Socket.IO event names shared between API (server) and Nuxt apps (client).

export const SocketEvents = {
  // server -> client, delivered to a user's personal room
  NOTIFICATION: "notification",
  ABSENCE_ALERT: "absence:alert",
  ALERT_RESPONDED: "absence:responded",
  MEDIA_SHARED: "media:shared",
  REPORT_PUBLISHED: "report:published",
  PROGRESS_PUBLISHED: "progress:published",
  MESSAGE_NEW: "message:new",
  INVOICE_ISSUED: "invoice:issued",
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

// The room a given user listens on
export const userRoom = (userId: string) => `user:${userId}`;
