import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  createEntity,
  createRelationship,
  deleteEntity,
  deleteRelationship,
  getGraph,
  isFamilyMember,
  listEntities,
  listRelationships,
  resolveUserId,
} from "./repository.js";

const entityTypeSchema = z.enum([
  "person",
  "place",
  "organization",
  "event",
  "concept",
  "document",
]);

const relationshipTypeSchema = z.enum([
  "related_to",
  "parent_of",
  "located_in",
  "owns",
  "part_of",
  "scheduled_at",
  "paid_by",
  "preferred_by",
  "associated_with",
]);

const createEntitySchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(200),
  type: entityTypeSchema,
  metadata: z.record(z.unknown()).optional(),
});

const createRelationshipSchema = z.object({
  familyId: z.string().uuid(),
  fromEntityId: z.string().uuid(),
  toEntityId: z.string().uuid(),
  type: relationshipTypeSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const kgRouter: ExpressRouter = Router();
kgRouter.use(withCaller);

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

// ---- Graph ----

kgRouter.get("/graph", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const graph = await getGraph(parsed.data.familyId);
  res.json({ data: graph });
});

// ---- Entities ----

kgRouter.get("/entities", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const entities = await listEntities(parsed.data.familyId);
  res.json({ data: entities });
});

kgRouter.post("/entities", async (req, res) => {
  const parsed = createEntitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const entity = await createEntity(parsed.data);
  res.status(201).json({ data: entity });
});

kgRouter.delete("/entities/:id", async (req, res) => {
  await deleteEntity(req.params.id);
  res.status(204).end();
});

// ---- Relationships ----

kgRouter.get("/relationships", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const relationships = await listRelationships(parsed.data.familyId);
  res.json({ data: relationships });
});

kgRouter.post("/relationships", async (req, res) => {
  const parsed = createRelationshipSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const relationship = await createRelationship(parsed.data);
  res.status(201).json({ data: relationship });
});

kgRouter.delete("/relationships/:id", async (req, res) => {
  await deleteRelationship(req.params.id);
  res.status(204).end();
});
