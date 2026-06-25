import {
  customType,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { families, users } from "./families.js";

const vector = customType<{ data: string }>({
  dataType() {
    return "vector(768)";
  },
});

export const memoryTypeEnum = pgEnum("memory_type", [
  "preference",
  "goal",
  "habit",
  "fact",
  "event_summary",
  "travel_pattern",
  "financial_pattern",
]);

export const memorySourceEnum = pgEnum("memory_source", [
  "user_input",
  "ai_extracted",
  "system_observed",
]);

export const entityTypeEnum = pgEnum("entity_type", [
  "person",
  "place",
  "organization",
  "event",
  "concept",
  "document",
]);

export const relationshipTypeEnum = pgEnum("relationship_type", [
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

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const memories = pgTable("memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  type: memoryTypeEnum("type").notNull(),
  content: text("content").notNull(),
  source: memorySourceEnum("source").default("user_input").notNull(),
  embedding: vector("embedding"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const entities = pgTable("entities", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: entityTypeEnum("type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const relationships = pgTable("relationships", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  fromEntityId: uuid("from_entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  toEntityId: uuid("to_entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  type: relationshipTypeEnum("type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").default("New Conversation").notNull(),
  messages: jsonb("messages").default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
