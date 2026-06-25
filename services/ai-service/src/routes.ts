import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  chat,
  createConversation,
  createMemory,
  deleteMemory,
  getConversation,
  isFamilyMember,
  listConversations,
  listMemories,
  resolveUserId,
} from "./repository.js";
import { generateInsights } from "./rag.js";

const memoryTypeSchema = z.enum([
  "preference",
  "goal",
  "habit",
  "fact",
  "event_summary",
  "travel_pattern",
  "financial_pattern",
]);

const memorySourceSchema = z.enum(["user_input", "ai_extracted", "system_observed"]);

const createMemorySchema = z.object({
  familyId: z.string().uuid(),
  type: memoryTypeSchema,
  content: z.string().min(1).max(5000),
  source: memorySourceSchema.optional(),
});

const listMemoriesSchema = z.object({
  familyId: z.string().uuid(),
  type: memoryTypeSchema.optional(),
});

const chatSchema = z.object({
  familyId: z.string().uuid(),
  query: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

export const aiRouter: ExpressRouter = Router();
aiRouter.use(withCaller);

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

// ---- Chat ----

aiRouter.post("/chat", async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;

  try {
    const result = await chat(parsed.data, userId);
    res.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    res.status(500).json({ error: { code: "ai_error", message } });
  }
});

// ---- Insights ----

aiRouter.get("/insights", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const insights = await generateInsights(parsed.data.familyId);
  res.json({ data: insights });
});

// ---- Memories ----

aiRouter.get("/memories", async (req, res) => {
  const parsed = listMemoriesSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const memories = await listMemories(parsed.data);
  res.json({ data: memories });
});

aiRouter.post("/memories", async (req, res) => {
  const parsed = createMemorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const memory = await createMemory(parsed.data);
  res.status(201).json({ data: memory });
});

aiRouter.delete("/memories/:id", async (req, res) => {
  await deleteMemory(req.params.id);
  res.status(204).end();
});

// ---- Conversations ----

aiRouter.get("/conversations", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const conversations = await listConversations(parsed.data.familyId, userId);
  res.json({ data: conversations });
});

aiRouter.get("/conversations/:id", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const conversation = await getConversation(req.params.id, parsed.data.familyId);
  if (!conversation) {
    res.status(404).json({ error: { code: "not_found", message: "Conversation not found" } });
    return;
  }
  res.json({ data: conversation });
});

aiRouter.post("/conversations", async (req, res) => {
  const parsed = z.object({
    familyId: z.string().uuid(),
    title: z.string().max(200).optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const conversation = await createConversation(parsed.data.familyId, userId, parsed.data.title);
  res.status(201).json({ data: conversation });
});
