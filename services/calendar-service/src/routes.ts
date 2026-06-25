import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  createEvent,
  deleteEvent,
  getEvent,
  isFamilyMember,
  listEvents,
  resolveUserId,
  updateEvent,
} from "./repository.js";

const createSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  recurrenceRule: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  recurrenceRule: z.string().max(500).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
});

const listSchema = z.object({
  familyId: z.string().uuid(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const calendarRouter: ExpressRouter = Router();
calendarRouter.use(withCaller);

/** Resolves the caller and verifies active membership in the family. */
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

calendarRouter.get("/events", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;

  const events = await listEvents({
    familyId: parsed.data.familyId,
    from: parsed.data.from ? new Date(parsed.data.from) : undefined,
    to: parsed.data.to ? new Date(parsed.data.to) : undefined,
  });
  res.json({ data: events });
});

calendarRouter.post("/events", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;

  const event = await createEvent(userId, parsed.data);
  res.status(201).json({ data: event });
});

calendarRouter.patch("/events/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const existing = await getEvent(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Event not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;

  const event = await updateEvent(req.params.id, parsed.data);
  res.json({ data: event });
});

calendarRouter.delete("/events/:id", async (req, res) => {
  const existing = await getEvent(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Event not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;

  await deleteEvent(req.params.id);
  res.status(204).end();
});
