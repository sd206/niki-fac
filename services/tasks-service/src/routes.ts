import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  createTask,
  deleteTask,
  getTask,
  isFamilyMember,
  listTasks,
  resolveUserId,
  updateTask,
} from "./repository.js";

const createSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().uuid().optional(),
  type: z.enum(["personal", "family", "chore"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueAt: z.string().datetime().optional(),
  points: z.number().int().min(0).max(1000).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  type: z.enum(["personal", "family", "chore"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  points: z.number().int().min(0).max(1000).optional(),
});

const listSchema = z.object({
  familyId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  assigneeId: z.string().uuid().optional(),
});

export const tasksRouter: ExpressRouter = Router();
tasksRouter.use(withCaller);

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

tasksRouter.get("/tasks", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;

  const tasks = await listTasks(parsed.data);
  res.json({ data: tasks });
});

tasksRouter.post("/tasks", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;

  const task = await createTask(userId, parsed.data);
  res.status(201).json({ data: task });
});

tasksRouter.patch("/tasks/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const existing = await getTask(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Task not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;

  const task = await updateTask(req.params.id, existing.familyId, userId, parsed.data);
  res.json({ data: task });
});

tasksRouter.delete("/tasks/:id", async (req, res) => {
  const existing = await getTask(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Task not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;

  await deleteTask(req.params.id);
  res.status(204).end();
});
