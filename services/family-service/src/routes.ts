import { ROLE_RANK, type FamilyRole } from "@niki/shared-types";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  acceptInvitation,
  createFamily,
  createInvitation,
  getMembership,
  listActivity,
  listFamiliesForUser,
  listInvitations,
  listMembers,
  revokeInvitation,
  upsertUser,
} from "./repository.js";

const roleSchema = z.enum(["owner", "parent", "adult", "child", "guest"]);

const createFamilySchema = z.object({ name: z.string().min(1).max(120) });

const inviteSchema = z.object({
  channel: z.enum(["email", "sms", "link"]),
  destination: z.string().min(1).optional(),
  role: roleSchema,
});

const joinSchema = z.object({ token: z.string().min(1) });

export const familyRouter: ExpressRouter = Router();

familyRouter.use(withCaller);

familyRouter.get("/", async (req, res) => {
  const userId = await upsertUser(req.caller!);
  const families = await listFamiliesForUser(userId);
  res.json({ data: families });
});

familyRouter.post("/", async (req, res) => {
  const parsed = createFamilySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await upsertUser(req.caller!);
  const family = await createFamily(userId, parsed.data.name);
  res.status(201).json({ data: family });
});

familyRouter.post("/:familyId/invitations", async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const { familyId } = req.params;
  const userId = await upsertUser(req.caller!);
  const membership = await getMembership(familyId, userId);
  if (!membership || ROLE_RANK[membership.role as FamilyRole] < ROLE_RANK.parent) {
    res.status(403).json({ error: { code: "forbidden", message: "Only parents/owners can invite" } });
    return;
  }
  const invitation = await createInvitation({
    familyId,
    actorId: userId,
    channel: parsed.data.channel,
    destination: parsed.data.destination ?? null,
    role: parsed.data.role,
  });
  res.status(201).json({ data: invitation });
});

familyRouter.post("/join", async (req, res) => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await upsertUser(req.caller!);
  const result = await acceptInvitation(userId, parsed.data.token);
  if (!result.ok) {
    res.status(400).json({ error: { code: result.reason, message: `Invitation ${result.reason}` } });
    return;
  }
  res.json({ data: { familyId: result.familyId, role: result.role } });
});

// ---- Member directory ----

familyRouter.get("/:familyId/members", async (req, res) => {
  const { familyId } = req.params;
  const userId = await upsertUser(req.caller!);
  const membership = await getMembership(familyId, userId);
  if (!membership) {
    res.status(403).json({ error: { code: "forbidden", message: "Not a member of this family" } });
    return;
  }
  const members = await listMembers(familyId);
  res.json({ data: members });
});

// ---- Invitation management ----

familyRouter.get("/:familyId/invitations", async (req, res) => {
  const { familyId } = req.params;
  const userId = await upsertUser(req.caller!);
  const membership = await getMembership(familyId, userId);
  if (!membership) {
    res.status(403).json({ error: { code: "forbidden", message: "Not a member of this family" } });
    return;
  }
  const invitations = await listInvitations(familyId);
  res.json({ data: invitations });
});

familyRouter.delete("/:familyId/invitations/:invitationId", async (req, res) => {
  const { familyId, invitationId } = req.params;
  const userId = await upsertUser(req.caller!);
  const membership = await getMembership(familyId, userId);
  if (!membership || ROLE_RANK[membership.role as FamilyRole] < ROLE_RANK.parent) {
    res.status(403).json({ error: { code: "forbidden", message: "Only parents/owners can revoke invitations" } });
    return;
  }
  const revoked = await revokeInvitation(invitationId, familyId);
  if (!revoked) {
    res.status(404).json({ error: { code: "not_found", message: "Invitation not found" } });
    return;
  }
  res.status(204).end();
});

// ---- Activity feed ----

familyRouter.get("/:familyId/activity", async (req, res) => {
  const { familyId } = req.params;
  const userId = await upsertUser(req.caller!);
  const membership = await getMembership(familyId, userId);
  if (!membership) {
    res.status(403).json({ error: { code: "forbidden", message: "Not a member of this family" } });
    return;
  }
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 50;
  const activity = await listActivity(familyId, limit);
  res.json({ data: activity });
});
