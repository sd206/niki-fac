import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  isFamilyMember,
  listNotifications,
  markAllAsRead,
  markAsRead,
  resolveUserId,
} from "./repository.js";

const listSchema = z.object({
  familyId: z.string().uuid(),
  unreadOnly: z.string().optional(),
});

export const notificationRouter: ExpressRouter = Router();
notificationRouter.use(withCaller);

async function requireMembership(
  familyId: string,
  uid: string,
): Promise<string | null> {
  const userId = await resolveUserId(uid);
  if (!userId || !(await isFamilyMember(familyId, userId))) return null;
  return userId;
}

notificationRouter.get("/", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(parsed.data.familyId, req.caller!.uid);
  if (!userId) {
    res.status(403).json({ error: { code: "forbidden", message: "Not a member of this family" } });
    return;
  }
  const notifications = await listNotifications({
    familyId: parsed.data.familyId,
    userId,
    unreadOnly: parsed.data.unreadOnly === "true",
  });
  res.json({ data: notifications });
});

notificationRouter.patch("/:id/read", async (req, res) => {
  const updated = await markAsRead(req.params.id);
  if (!updated) {
    res.status(404).json({ error: { code: "not_found", message: "Notification not found" } });
    return;
  }
  res.json({ data: updated });
});

notificationRouter.post("/mark-all-read", async (req, res) => {
  const parsed = listSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(parsed.data.familyId, req.caller!.uid);
  if (!userId) {
    res.status(403).json({ error: { code: "forbidden", message: "Not a member of this family" } });
    return;
  }
  await markAllAsRead(parsed.data.familyId, userId);
  res.status(204).end();
});
