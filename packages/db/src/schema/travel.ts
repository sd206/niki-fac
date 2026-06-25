import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { families, users } from "./families.js";

export const reservationTypeEnum = pgEnum("reservation_type", [
  "flight",
  "hotel",
  "car",
  "restaurant",
  "activity",
  "other",
]);

export const packingStatusEnum = pgEnum("packing_status", [
  "not_packed",
  "packed",
]);

export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  destination: text("destination"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reservations = pgTable("reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  type: reservationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  provider: text("provider"),
  confirmationCode: text("confirmation_code"),
  startDateTime: timestamp("start_date_time", { withTimezone: true }),
  endDateTime: timestamp("end_date_time", { withTimezone: true }),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  notes: text("notes"),
  documentId: uuid("document_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const packingItems = pgTable("packing_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  assigneeId: uuid("assignee_id").references(() => users.id),
  status: packingStatusEnum("status").default("not_packed").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
