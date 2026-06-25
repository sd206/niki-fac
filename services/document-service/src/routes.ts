import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  createDocument,
  deleteDocument,
  getDocument,
  isFamilyMember,
  listDocuments,
  resolveUserId,
  updateDocument,
} from "./repository.js";

const listSchema = z.object({
  familyId: z.string().uuid(),
  category: z.enum(["general", "medical", "insurance", "tax", "receipt", "travel", "education", "property", "other"]).optional(),
  folderId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

const createSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(300),
  path: z.string().min(1).max(1000),
  mimeType: z.string().max(200).optional(),
  category: z.enum(["general", "medical", "insurance", "tax", "receipt", "travel", "education", "property", "other"]).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  permissions: z.enum(["family", "parents", "private", "custom"]).optional(),
  driveFileId: z.string().max(200).optional(),
  folderId: z.string().uuid().optional(),
  sizeBytes: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  category: z.enum(["general", "medical", "insurance", "tax", "receipt", "travel", "education", "property", "other"]).optional(),
  tags: z.array(z.string().max(60)).max(20).nullable().optional(),
  permissions: z.enum(["family", "parents", "private", "custom"]).optional(),
  ocrStatus: z.enum(["pending", "processing", "done", "failed", "not_applicable"]).optional(),
  ocrText: z.string().nullable().optional(),
});

export const documentRouter: ExpressRouter = Router();
documentRouter.use(withCaller);

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

documentRouter.get("/", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const docs = await listDocuments(parsed.data);
  res.json({ data: docs });
});

documentRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const doc = await createDocument(userId, parsed.data);
  res.status(201).json({ data: doc });
});

documentRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const existing = await getDocument(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Document not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  const doc = await updateDocument(req.params.id, parsed.data);
  res.json({ data: doc });
});

documentRouter.delete("/:id", async (req, res) => {
  const existing = await getDocument(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Document not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  await deleteDocument(req.params.id);
  res.status(204).end();
});
