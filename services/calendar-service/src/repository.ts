import { getDb, schema, writeAuditLog } from "@niki/db";
import type { CalendarEvent, CreateEventRequest, UpdateEventRequest } from "@niki/shared-types";
import { and, asc, eq, gte, lte } from "drizzle-orm";

// ---- RRULE recurrence expansion (basic FREQ + COUNT/UNTIL) ----

interface ParsedRRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY";
  count?: number;
  until?: Date;
}

function parseRRule(rule: string): ParsedRRule | null {
  const parts = rule.split(";");
  const map = new Map<string, string>();
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k && v) map.set(k.toUpperCase(), v);
  }
  const freq = map.get("FREQ");
  if (freq !== "DAILY" && freq !== "WEEKLY" && freq !== "MONTHLY") return null;
  const result: ParsedRRule = { freq };
  const count = map.get("COUNT");
  if (count) result.count = Number(count);
  const until = map.get("UNTIL");
  if (until) {
    // UNTIL=YYYYMMDD or UNTIL=YYYYMMDDTHHMMSSZ
    const d = until.length === 8
      ? new Date(until.slice(0, 4) + "-" + until.slice(4, 6) + "-" + until.slice(6, 8))
      : new Date(
          until.slice(0, 4) + "-" + until.slice(4, 6) + "-" + until.slice(6, 8) +
          "T" + until.slice(9, 11) + ":" + until.slice(11, 13) + ":" + until.slice(13, 15) + "Z"
        );
    result.until = d;
  }
  return result;
}

function expandRecurrence(
  startAt: Date,
  rule: string,
  from: Date,
  to: Date,
): Date[] {
  const parsed = parseRRule(rule);
  if (!parsed) return [];

  const occurrences: Date[] = [];
  const durationMs = 24 * 60 * 60 * 1000; // 1 day default step
  const maxOccurrences = 365; // safety limit

  let current = new Date(startAt);
  let count = 0;

  while (count < maxOccurrences) {
    if (current > to) break;
    if (parsed.count && count >= parsed.count) break;
    if (parsed.until && current > parsed.until) break;

    if (current >= from) {
      occurrences.push(new Date(current));
    }

    switch (parsed.freq) {
      case "DAILY":
        current = new Date(current.getTime() + durationMs);
        break;
      case "WEEKLY":
        current = new Date(current.getTime() + 7 * durationMs);
        break;
      case "MONTHLY":
        current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate(),
          current.getHours(), current.getMinutes(), current.getSeconds());
        break;
    }
    count++;
  }

  return occurrences;
}

/** Serializes a DB event row to the API type, expanding recurring events. */
function expandEvent(row: typeof schema.events.$inferSelect, from?: Date, to?: Date): CalendarEvent[] {
  const base: CalendarEvent = {
    id: row.id,
    familyId: row.familyId,
    title: row.title,
    description: row.description,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt ? row.endAt.toISOString() : null,
    recurrenceRule: row.recurrenceRule,
    ownerId: row.ownerId,
    source: row.source as CalendarEvent["source"],
    color: row.color,
    createdAt: row.createdAt.toISOString(),
  };

  if (!row.recurrenceRule || !from || !to) {
    return [base];
  }

  const occurrences = expandRecurrence(row.startAt, row.recurrenceRule, from, to);
  if (occurrences.length === 0) return [];

  return occurrences.map((occ, idx) => ({
    ...base,
    id: idx === 0 ? row.id : `${row.id}__${occ.toISOString()}`,
    startAt: occ.toISOString(),
    endAt: row.endAt
      ? new Date(occ.getTime() + (row.endAt.getTime() - row.startAt.getTime())).toISOString()
      : null,
  }));
}

/** Resolves the internal user id for a Firebase uid, or null if unknown. */
export async function resolveUserId(firebaseUid: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.firebaseUid, firebaseUid))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Returns true if the user is an active member of the family. */
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

export async function listEvents(params: {
  familyId: string;
  from?: Date;
  to?: Date;
}) {
  const db = getDb();
  const conditions = [eq(schema.events.familyId, params.familyId)];
  if (params.from) conditions.push(gte(schema.events.startAt, params.from));
  if (params.to) conditions.push(lte(schema.events.startAt, params.to));

  const rows = await db
    .select()
    .from(schema.events)
    .where(and(...conditions))
    .orderBy(asc(schema.events.startAt));

  // Expand recurring events into virtual occurrences within the date range
  const expanded: CalendarEvent[] = [];
  for (const row of rows) {
    const events = expandEvent(row, params.from, params.to);
    expanded.push(...events);
  }
  expanded.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return expanded;
}

export async function createEvent(ownerId: string, input: CreateEventRequest) {
  const db = getDb();
  const inserted = await db
    .insert(schema.events)
    .values({
      familyId: input.familyId,
      title: input.title,
      description: input.description ?? null,
      startAt: new Date(input.startAt),
      endAt: input.endAt ? new Date(input.endAt) : null,
      recurrenceRule: input.recurrenceRule ?? null,
      ownerId,
      color: input.color ?? null,
    })
    .returning();
  const evt = inserted[0]!;
  await writeAuditLog({
    familyId: evt.familyId,
    actorId: ownerId,
    action: "created",
    entity: "event",
    entityId: evt.id,
    after: { title: evt.title, startAt: evt.startAt.toISOString() },
  });
  return evt;
}

export async function getEvent(eventId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.id, eventId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateEvent(eventId: string, patch: UpdateEventRequest) {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.description !== undefined) values.description = patch.description;
  if (patch.startAt !== undefined) values.startAt = new Date(patch.startAt);
  if (patch.endAt !== undefined) values.endAt = patch.endAt ? new Date(patch.endAt) : null;
  if (patch.recurrenceRule !== undefined) values.recurrenceRule = patch.recurrenceRule;
  if (patch.color !== undefined) values.color = patch.color;

  const updated = await db
    .update(schema.events)
    .set(values)
    .where(eq(schema.events.id, eventId))
    .returning();
  return updated[0] ?? null;
}

export async function deleteEvent(eventId: string, familyId?: string, actorId?: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.events).where(eq(schema.events.id, eventId));
  if (familyId && actorId) {
    await writeAuditLog({ familyId, actorId, action: "deleted", entity: "event", entityId: eventId });
  }
}
