import { getDb, schema } from "@niki/db";
import type {
  CreateDocumentRequest,
  Document,
  ListDocumentsQuery,
  UpdateDocumentRequest,
} from "@niki/shared-types";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

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

export async function listDocuments(params: ListDocumentsQuery): Promise<Document[]> {
  const db = getDb();
  const conditions = [eq(schema.documents.familyId, params.familyId)];
  if (params.category) conditions.push(eq(schema.documents.category, params.category));
  if (params.folderId) conditions.push(eq(schema.documents.folderId, params.folderId));
  if (params.search) {
    conditions.push(
      or(
        ilike(schema.documents.name, `%${params.search}%`),
        ilike(schema.documents.ocrText, `%${params.search}%`),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(schema.documents)
    .where(and(...conditions))
    .orderBy(asc(schema.documents.name));

  return rows.map(rowToDocument);
}

export async function createDocument(ownerId: string, input: CreateDocumentRequest): Promise<Document> {
  const db = getDb();
  const inserted = await db
    .insert(schema.documents)
    .values({
      familyId: input.familyId,
      ownerId,
      name: input.name,
      path: input.path,
      mimeType: input.mimeType ?? null,
      category: input.category ?? "general",
      tags: input.tags ?? null,
      permissions: input.permissions ?? "family",
      driveFileId: input.driveFileId ?? null,
      folderId: input.folderId ?? null,
      sizeBytes: input.sizeBytes ?? null,
    })
    .returning();
  return rowToDocument(inserted[0]!);
}

export async function getDocument(docId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, docId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateDocument(docId: string, patch: UpdateDocumentRequest) {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.category !== undefined) values.category = patch.category;
  if (patch.tags !== undefined) values.tags = patch.tags;
  if (patch.permissions !== undefined) values.permissions = patch.permissions;
  if (patch.ocrStatus !== undefined) values.ocrStatus = patch.ocrStatus;
  if (patch.ocrText !== undefined) values.ocrText = patch.ocrText;

  const updated = await db
    .update(schema.documents)
    .set(values)
    .where(eq(schema.documents.id, docId))
    .returning();
  return updated[0] ? rowToDocument(updated[0]) : null;
}

export async function deleteDocument(docId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.documents).where(eq(schema.documents.id, docId));
}

/** Simple keyword search over document name + OCR text. */
export async function searchDocuments(familyId: string, query: string): Promise<Document[]> {
  return listDocuments({ familyId, search: query });
}

function rowToDocument(row: typeof schema.documents.$inferSelect): Document {
  return {
    id: row.id,
    familyId: row.familyId,
    driveFileId: row.driveFileId,
    folderId: row.folderId,
    ownerId: row.ownerId,
    name: row.name,
    path: row.path,
    mimeType: row.mimeType,
    category: row.category as Document["category"],
    tags: row.tags,
    permissions: row.permissions as Document["permissions"],
    ocrStatus: row.ocrStatus as Document["ocrStatus"],
    ocrText: row.ocrText,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
  };
}
