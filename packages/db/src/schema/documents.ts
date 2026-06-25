import {
  customType,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { families, users } from "./families.js";

// pgvector vector(768) type
const vector = customType<{ data: string }>({
  dataType() {
    return "vector(768)";
  },
});

export const documentCategoryEnum = pgEnum("document_category", [
  "general",
  "medical",
  "insurance",
  "tax",
  "receipt",
  "travel",
  "education",
  "property",
  "other",
]);

export const documentPermissionEnum = pgEnum("document_permission", [
  "family",
  "parents",
  "private",
  "custom",
]);

export const ocrStatusEnum = pgEnum("ocr_status", [
  "pending",
  "processing",
  "done",
  "failed",
  "not_applicable",
]);

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  driveFileId: text("drive_file_id"),
  folderId: uuid("folder_id"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  path: text("path").notNull(),
  mimeType: text("mime_type"),
  category: documentCategoryEnum("category").default("general").notNull(),
  tags: text("tags").array(),
  permissions: documentPermissionEnum("permissions").default("family").notNull(),
  ocrStatus: ocrStatusEnum("ocr_status").default("not_applicable").notNull(),
  ocrText: text("ocr_text"),
  sizeBytes: numeric("size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  chunkText: text("chunk_text").notNull(),
  embedding: vector("embedding"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
