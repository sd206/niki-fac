import { getDb, schema, writeAuditLog } from "@niki/db";
import type {
  CreatePackingItemRequest,
  CreateReservationRequest,
  CreateTripRequest,
  PackingItem,
  Reservation,
  Trip,
  UpdatePackingItemRequest,
  UpdateTripRequest,
} from "@niki/shared-types";
import { and, asc, eq } from "drizzle-orm";

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

// ---- Trips ----

export async function listTrips(familyId: string): Promise<Trip[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.trips)
    .where(eq(schema.trips.familyId, familyId))
    .orderBy(asc(schema.trips.startDate));
  return rows.map(rowToTrip);
}

export async function createTrip(userId: string, input: CreateTripRequest): Promise<Trip> {
  const db = getDb();
  const inserted = await db
    .insert(schema.trips)
    .values({
      familyId: input.familyId,
      name: input.name,
      destination: input.destination ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      budget: input.budget ?? null,
      notes: input.notes ?? null,
      createdBy: userId,
    })
    .returning();
  const trip = rowToTrip(inserted[0]!);
  await writeAuditLog({ familyId: input.familyId, actorId: userId, action: "created", entity: "trip", entityId: trip.id, after: { name: trip.name, destination: trip.destination } });
  return trip;
}

export async function getTrip(tripId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.trips)
    .where(eq(schema.trips.id, tripId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateTrip(tripId: string, patch: UpdateTripRequest): Promise<Trip | null> {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.destination !== undefined) values.destination = patch.destination;
  if (patch.startDate !== undefined) values.startDate = patch.startDate;
  if (patch.endDate !== undefined) values.endDate = patch.endDate;
  if (patch.budget !== undefined) values.budget = patch.budget;
  if (patch.notes !== undefined) values.notes = patch.notes;

  const updated = await db
    .update(schema.trips)
    .set(values)
    .where(eq(schema.trips.id, tripId))
    .returning();
  return updated[0] ? rowToTrip(updated[0]) : null;
}

export async function deleteTrip(tripId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.trips).where(eq(schema.trips.id, tripId));
}

// ---- Reservations ----

export async function listReservations(tripId: string): Promise<Reservation[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.reservations)
    .where(eq(schema.reservations.tripId, tripId))
    .orderBy(asc(schema.reservations.startDateTime));
  return rows.map(rowToReservation);
}

export async function createReservation(input: CreateReservationRequest, familyId?: string, actorId?: string): Promise<Reservation> {
  const db = getDb();
  const inserted = await db
    .insert(schema.reservations)
    .values({
      tripId: input.tripId,
      type: input.type,
      title: input.title,
      provider: input.provider ?? null,
      confirmationCode: input.confirmationCode ?? null,
      startDateTime: input.startDateTime ? new Date(input.startDateTime) : null,
      endDateTime: input.endDateTime ? new Date(input.endDateTime) : null,
      cost: input.cost ?? null,
      notes: input.notes ?? null,
      documentId: input.documentId ?? null,
    })
    .returning();
  const res = rowToReservation(inserted[0]!);
  if (familyId) {
    await writeAuditLog({ familyId, actorId, action: "created", entity: "reservation", entityId: res.id, after: { title: res.title, type: res.type } });
  }
  return res;
}

export async function getReservation(reservationId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.reservations)
    .where(eq(schema.reservations.id, reservationId))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteReservation(reservationId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.reservations).where(eq(schema.reservations.id, reservationId));
}

// ---- Packing Items ----

export async function listPackingItems(tripId: string): Promise<PackingItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.packingItems)
    .where(eq(schema.packingItems.tripId, tripId))
    .orderBy(asc(schema.packingItems.name));
  return rows.map(rowToPackingItem);
}

export async function createPackingItem(input: CreatePackingItemRequest): Promise<PackingItem> {
  const db = getDb();
  const inserted = await db
    .insert(schema.packingItems)
    .values({
      tripId: input.tripId,
      name: input.name,
      category: input.category ?? null,
      assigneeId: input.assigneeId ?? null,
    })
    .returning();
  return rowToPackingItem(inserted[0]!);
}

export async function updatePackingItem(
  itemId: string,
  patch: UpdatePackingItemRequest,
): Promise<PackingItem | null> {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.category !== undefined) values.category = patch.category;
  if (patch.status !== undefined) values.status = patch.status;

  const updated = await db
    .update(schema.packingItems)
    .set(values)
    .where(eq(schema.packingItems.id, itemId))
    .returning();
  return updated[0] ? rowToPackingItem(updated[0]) : null;
}

export async function deletePackingItem(itemId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.packingItems).where(eq(schema.packingItems.id, itemId));
}

// ---- Mappers ----

function rowToTrip(row: typeof schema.trips.$inferSelect): Trip {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    destination: row.destination,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    budget: row.budget,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToReservation(row: typeof schema.reservations.$inferSelect): Reservation {
  return {
    id: row.id,
    tripId: row.tripId,
    type: row.type as Reservation["type"],
    title: row.title,
    provider: row.provider,
    confirmationCode: row.confirmationCode,
    startDateTime: row.startDateTime ? row.startDateTime.toISOString() : null,
    endDateTime: row.endDateTime ? row.endDateTime.toISOString() : null,
    cost: row.cost,
    notes: row.notes,
    documentId: row.documentId,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToPackingItem(row: typeof schema.packingItems.$inferSelect): PackingItem {
  return {
    id: row.id,
    tripId: row.tripId,
    name: row.name,
    category: row.category,
    assigneeId: row.assigneeId,
    status: row.status as PackingItem["status"],
    createdAt: row.createdAt.toISOString(),
  };
}
