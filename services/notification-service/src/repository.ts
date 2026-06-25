import { getDb, schema } from "@niki/db";
import type { Notification } from "@niki/shared-types";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function resolveUserId(firebaseUid: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.firebaseUid, firebaseUid))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function isFamilyMember(familyId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ userId: schema.familyMembers.userId })
    .from(schema.familyMembers)
    .where(
      and(
        eq(schema.familyMembers.familyId, familyId),
        eq(schema.familyMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function listNotifications(params: {
  familyId: string;
  userId: string;
  unreadOnly?: boolean;
}) {
  const db = getDb();
  const conditions = [
    eq(schema.notifications.familyId, params.familyId),
    eq(schema.notifications.userId, params.userId),
  ];
  if (params.unreadOnly) conditions.push(isNull(schema.notifications.readAt));

  const rows = await db
    .select()
    .from(schema.notifications)
    .where(and(...conditions))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(100);

  return rows.map(rowToNotification);
}

export async function markAsRead(notificationId: string): Promise<Notification | null> {
  const db = getDb();
  const updated = await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(eq(schema.notifications.id, notificationId))
    .returning();
  return updated[0] ? rowToNotification(updated[0]) : null;
}

export async function markAllAsRead(familyId: string, userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.familyId, familyId),
        eq(schema.notifications.userId, userId),
        isNull(schema.notifications.readAt),
      ),
    );
}

/**
 * Creates a notification. Called internally by other services or event handlers.
 * FCM push delivery is stubbed - real FCM requires device token registration.
 */
export async function createNotification(params: {
  familyId: string;
  userId: string | null;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}) {
  const db = getDb();
  const inserted = await db
    .insert(schema.notifications)
    .values({
      familyId: params.familyId,
      userId: params.userId,
      channel: "in_app",
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      payload: params.payload ?? null,
    })
    .returning();
  return rowToNotification(inserted[0]!);
}

function rowToNotification(row: typeof schema.notifications.$inferSelect): Notification {
  return {
    id: row.id,
    familyId: row.familyId,
    userId: row.userId,
    channel: row.channel as Notification["channel"],
    type: row.type,
    title: row.title,
    body: row.body,
    payload: row.payload as Record<string, unknown> | null,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
