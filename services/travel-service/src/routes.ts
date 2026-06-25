import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  createPackingItem,
  createReservation,
  createTrip,
  deletePackingItem,
  deleteReservation,
  deleteTrip,
  getReservation,
  getTrip,
  isFamilyMember,
  listPackingItems,
  listReservations,
  listTrips,
  resolveUserId,
  updatePackingItem,
  updateTrip,
} from "./repository.js";

const reservationTypeSchema = z.enum(["flight", "hotel", "car", "restaurant", "activity", "other"]);
const packingStatusSchema = z.enum(["not_packed", "packed"]);

const createTripSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(200),
  destination: z.string().max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budget: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
  notes: z.string().max(2000).optional(),
});

const updateTripSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  destination: z.string().max(200).nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  budget: z.union([z.string(), z.number()]).transform((v) => String(v)).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const createReservationSchema = z.object({
  tripId: z.string().uuid(),
  type: reservationTypeSchema,
  title: z.string().min(1).max(200),
  provider: z.string().max(200).optional(),
  confirmationCode: z.string().max(100).optional(),
  startDateTime: z.string().datetime().optional(),
  endDateTime: z.string().datetime().optional(),
  cost: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
  notes: z.string().max(2000).optional(),
  documentId: z.string().uuid().optional(),
});

const createPackingSchema = z.object({
  tripId: z.string().uuid(),
  name: z.string().min(1).max(200),
  category: z.string().max(60).optional(),
  assigneeId: z.string().uuid().optional(),
});

const updatePackingSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(60).nullable().optional(),
  status: packingStatusSchema.optional(),
});

export const travelRouter: ExpressRouter = Router();
travelRouter.use(withCaller);

async function requireMembership(
  req: Request,
  res: Response,
  familyId: string,
): Promise<string | null> {
  const userId = await resolveUserId(req.caller!.uid);
  if (!userId || !(await isFamilyMember(familyId, userId))) {
    res.status(403).json({ error: { code: "forbidden", message: "Not a member of this family" } });
    return null;
  }
  return userId;
}

// ---- Trips ----

travelRouter.get("/trips", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const trips = await listTrips(parsed.data.familyId);
  res.json({ data: trips });
});

travelRouter.post("/trips", async (req, res) => {
  const parsed = createTripSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const trip = await createTrip(userId, parsed.data);
  res.status(201).json({ data: trip });
});

travelRouter.patch("/trips/:id", async (req, res) => {
  const parsed = updateTripSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const existing = await getTrip(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  const trip = await updateTrip(req.params.id, parsed.data);
  res.json({ data: trip });
});

travelRouter.delete("/trips/:id", async (req, res) => {
  const existing = await getTrip(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  await deleteTrip(req.params.id);
  res.status(204).end();
});

// ---- Reservations ----

travelRouter.get("/trips/:tripId/reservations", async (req, res) => {
  const trip = await getTrip(req.params.tripId);
  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }
  const userId = await requireMembership(req, res, trip.familyId);
  if (!userId) return;
  const reservations = await listReservations(req.params.tripId);
  res.json({ data: reservations });
});

travelRouter.post("/trips/:tripId/reservations", async (req, res) => {
  const parsed = createReservationSchema.safeParse({ ...req.body, tripId: req.params.tripId });
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const trip = await getTrip(req.params.tripId);
  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }
  const userId = await requireMembership(req, res, trip.familyId);
  if (!userId) return;
  const reservation = await createReservation(parsed.data, trip.familyId, userId);
  res.status(201).json({ data: reservation });
});

travelRouter.delete("/reservations/:id", async (req, res) => {
  const reservation = await getReservation(req.params.id);
  if (!reservation) {
    res.status(404).json({ error: { code: "not_found", message: "Reservation not found" } });
    return;
  }
  const trip = await getTrip(reservation.tripId);
  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }
  const userId = await requireMembership(req, res, trip.familyId);
  if (!userId) return;
  await deleteReservation(req.params.id);
  res.status(204).end();
});

// ---- Packing Items ----

travelRouter.get("/trips/:tripId/packing", async (req, res) => {
  const trip = await getTrip(req.params.tripId);
  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }
  const userId = await requireMembership(req, res, trip.familyId);
  if (!userId) return;
  const items = await listPackingItems(req.params.tripId);
  res.json({ data: items });
});

travelRouter.post("/trips/:tripId/packing", async (req, res) => {
  const parsed = createPackingSchema.safeParse({ ...req.body, tripId: req.params.tripId });
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const trip = await getTrip(req.params.tripId);
  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }
  const userId = await requireMembership(req, res, trip.familyId);
  if (!userId) return;
  const item = await createPackingItem(parsed.data);
  res.status(201).json({ data: item });
});

travelRouter.patch("/packing/:id", async (req, res) => {
  const parsed = updatePackingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const updated = await updatePackingItem(req.params.id, parsed.data);
  if (!updated) {
    res.status(404).json({ error: { code: "not_found", message: "Packing item not found" } });
    return;
  }
  res.json({ data: updated });
});

travelRouter.delete("/packing/:id", async (req, res) => {
  await deletePackingItem(req.params.id);
  res.status(204).end();
});
