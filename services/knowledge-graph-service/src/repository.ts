import type {
  CreateEntityRequest,
  CreateRelationshipRequest,
  Entity,
  KnowledgeGraph,
  Relationship,
} from "@niki/shared-types";
import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, schema } from "@niki/db";

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

// ---- Entities ----

export async function listEntities(familyId: string): Promise<Entity[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.entities)
    .where(eq(schema.entities.familyId, familyId))
    .orderBy(asc(schema.entities.name));
  return rows.map(rowToEntity);
}

export async function createEntity(input: CreateEntityRequest): Promise<Entity> {
  const db = getDb();
  const inserted = await db
    .insert(schema.entities)
    .values({
      familyId: input.familyId,
      name: input.name,
      type: input.type,
      metadata: input.metadata ?? null,
    })
    .returning();
  return rowToEntity(inserted[0]!);
}

export async function deleteEntity(entityId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.entities).where(eq(schema.entities.id, entityId));
}

// ---- Relationships ----

export async function listRelationships(familyId: string): Promise<Relationship[]> {
  const db = getDb();
  const fromEnt = alias(schema.entities, "from_ent");
  const toEnt = alias(schema.entities, "to_ent");

  const rows = await db
    .select({
      id: schema.relationships.id,
      familyId: schema.relationships.familyId,
      fromEntityId: schema.relationships.fromEntityId,
      toEntityId: schema.relationships.toEntityId,
      type: schema.relationships.type,
      metadata: schema.relationships.metadata,
      createdAt: schema.relationships.createdAt,
      fromEntityName: fromEnt.name,
      toEntityName: toEnt.name,
    })
    .from(schema.relationships)
    .innerJoin(fromEnt, eq(schema.relationships.fromEntityId, fromEnt.id))
    .innerJoin(toEnt, eq(schema.relationships.toEntityId, toEnt.id))
    .where(eq(schema.relationships.familyId, familyId))
    .orderBy(asc(schema.relationships.createdAt));

  return rows.map((row) => ({
    id: row.id,
    familyId: row.familyId,
    fromEntityId: row.fromEntityId,
    toEntityId: row.toEntityId,
    fromEntityName: row.fromEntityName,
    toEntityName: row.toEntityName,
    type: row.type as Relationship["type"],
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createRelationship(input: CreateRelationshipRequest): Promise<Relationship> {
  const db = getDb();
  const inserted = await db
    .insert(schema.relationships)
    .values({
      familyId: input.familyId,
      fromEntityId: input.fromEntityId,
      toEntityId: input.toEntityId,
      type: input.type,
      metadata: input.metadata ?? null,
    })
    .returning();

  // Fetch entity names for the response
  const fromEntity = await db
    .select({ name: schema.entities.name })
    .from(schema.entities)
    .where(eq(schema.entities.id, input.fromEntityId))
    .limit(1);
  const toEntity = await db
    .select({ name: schema.entities.name })
    .from(schema.entities)
    .where(eq(schema.entities.id, input.toEntityId))
    .limit(1);

  return {
    id: inserted[0]!.id,
    familyId: inserted[0]!.familyId,
    fromEntityId: inserted[0]!.fromEntityId,
    toEntityId: inserted[0]!.toEntityId,
    fromEntityName: fromEntity[0]?.name ?? "",
    toEntityName: toEntity[0]?.name ?? "",
    type: inserted[0]!.type as Relationship["type"],
    metadata: inserted[0]!.metadata as Record<string, unknown> | null,
    createdAt: inserted[0]!.createdAt.toISOString(),
  };
}

export async function deleteRelationship(relationshipId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.relationships).where(eq(schema.relationships.id, relationshipId));
}

// ---- Full Graph ----

export async function getGraph(familyId: string): Promise<KnowledgeGraph> {
  const [entities, relationships] = await Promise.all([
    listEntities(familyId),
    listRelationships(familyId),
  ]);
  return { entities, relationships };
}

// ---- Mapper ----

function rowToEntity(row: typeof schema.entities.$inferSelect): Entity {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    type: row.type as Entity["type"],
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt.toISOString(),
  };
}
