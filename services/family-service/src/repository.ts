import { getDb, schema } from "@niki/db";
import type { FamilyRole, InvitationChannel } from "@niki/shared-types";
import { and, desc, eq } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import type { CallerContext } from "./context.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Ensures a users row exists for the Firebase uid and returns its internal id. */
export async function upsertUser(caller: CallerContext): Promise<string> {
  const db = getDb();
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.firebaseUid, caller.uid))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const inserted = await db
    .insert(schema.users)
    .values({
      firebaseUid: caller.uid,
      email: caller.email,
      displayName: caller.displayName,
    })
    .returning({ id: schema.users.id });

  return inserted[0]!.id;
}

export async function createFamily(userId: string, name: string) {
  const db = getDb();
  const inserted = await db
    .insert(schema.families)
    .values({ name, ownerId: userId })
    .returning();
  const family = inserted[0]!;

  await db.insert(schema.familyMembers).values({
    familyId: family.id,
    userId,
    role: "owner",
    status: "active",
  });

  await writeAuditLog({
    familyId: family.id,
    actorId: userId,
    action: "created",
    entity: "family",
    entityId: family.id,
    after: { name },
  });

  return family;
}

export async function listFamiliesForUser(userId: string) {
  const db = getDb();
  return db
    .select({
      familyId: schema.familyMembers.familyId,
      role: schema.familyMembers.role,
      name: schema.families.name,
    })
    .from(schema.familyMembers)
    .innerJoin(schema.families, eq(schema.families.id, schema.familyMembers.familyId))
    .where(eq(schema.familyMembers.userId, userId));
}

export async function getMembership(familyId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.familyMembers)
    .where(
      and(
        eq(schema.familyMembers.familyId, familyId),
        eq(schema.familyMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createInvitation(params: {
  familyId: string;
  actorId: string;
  channel: InvitationChannel;
  destination: string | null;
  role: FamilyRole;
}) {
  const db = getDb();
  const token = randomBytes(24).toString("base64url");
  const inserted = await db
    .insert(schema.invitations)
    .values({
      id: randomUUID(),
      familyId: params.familyId,
      channel: params.channel,
      destination: params.destination,
      role: params.role,
      token,
      status: "pending",
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    })
    .returning();
  const invitation = inserted[0]!;

  await writeAuditLog({
    familyId: params.familyId,
    actorId: params.actorId,
    action: "invited",
    entity: "invitation",
    entityId: invitation.id,
    after: { channel: params.channel, role: params.role, destination: params.destination },
  });

  return invitation;
}

export async function acceptInvitation(userId: string, token: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.token, token))
    .limit(1);
  const invite = rows[0];

  if (!invite || invite.status !== "pending") {
    return { ok: false as const, reason: "invalid" };
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    await db
      .update(schema.invitations)
      .set({ status: "expired" })
      .where(eq(schema.invitations.id, invite.id));
    return { ok: false as const, reason: "expired" };
  }

  const existing = await getMembership(invite.familyId, userId);
  if (!existing) {
    await db.insert(schema.familyMembers).values({
      familyId: invite.familyId,
      userId,
      role: invite.role,
      status: "active",
    });
  }

  await db
    .update(schema.invitations)
    .set({ status: "accepted" })
    .where(eq(schema.invitations.id, invite.id));

  await writeAuditLog({
    familyId: invite.familyId,
    actorId: userId,
    action: "joined",
    entity: "family",
    entityId: invite.familyId,
    after: { role: invite.role },
  });

  return { ok: true as const, familyId: invite.familyId, role: invite.role };
}

// ---- Member directory ----

export async function listMembers(familyId: string) {
  const db = getDb();
  return db
    .select({
      userId: schema.familyMembers.userId,
      familyId: schema.familyMembers.familyId,
      role: schema.familyMembers.role,
      points: schema.familyMembers.points,
      status: schema.familyMembers.status,
      email: schema.users.email,
      displayName: schema.users.displayName,
      photoUrl: schema.users.photoUrl,
      createdAt: schema.familyMembers.createdAt,
    })
    .from(schema.familyMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.familyMembers.userId))
    .where(eq(schema.familyMembers.familyId, familyId));
}

// ---- Invitation management ----

export async function listInvitations(familyId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.familyId, familyId))
    .orderBy(desc(schema.invitations.createdAt));
}

export async function revokeInvitation(invitationId: string, familyId: string) {
  const db = getDb();
  const updated = await db
    .update(schema.invitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(schema.invitations.id, invitationId),
        eq(schema.invitations.familyId, familyId),
      ),
    )
    .returning();
  return updated[0] ?? null;
}

// ---- Audit log / activity feed ----

export async function writeAuditLog(params: {
  familyId: string;
  actorId: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  const db = getDb();
  await db.insert(schema.auditLog).values({
    familyId: params.familyId,
    actorId: params.actorId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId ?? null,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}

export async function listActivity(familyId: string, limit = 50) {
  const db = getDb();
  return db
    .select({
      id: schema.auditLog.id,
      familyId: schema.auditLog.familyId,
      actorId: schema.auditLog.actorId,
      actorName: schema.users.displayName,
      action: schema.auditLog.action,
      entity: schema.auditLog.entity,
      entityId: schema.auditLog.entityId,
      before: schema.auditLog.before,
      after: schema.auditLog.after,
      createdAt: schema.auditLog.createdAt,
    })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.actorId))
    .where(eq(schema.auditLog.familyId, familyId))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(limit);
}
