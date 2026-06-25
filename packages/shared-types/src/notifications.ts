export type NotificationChannel = "push" | "email" | "in_app";

export interface Notification {
  id: string;
  familyId: string;
  userId: string | null;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsQuery {
  familyId: string;
  unreadOnly?: boolean;
}
