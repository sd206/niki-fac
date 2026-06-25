import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { families, users } from "./families.js";

export const eventSourceEnum = pgEnum("event_source", [
  "manual",
  "ai",
  "google_calendar",
  "school",
  "sports",
  "travel",
]);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  recurrenceRule: text("recurrence_rule"),
  ownerId: uuid("owner_id").references(() => users.id),
  source: eventSourceEnum("source").default("manual").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
