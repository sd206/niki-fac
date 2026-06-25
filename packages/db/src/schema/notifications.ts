import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { families, users } from "./families.js";

export const notificationChannelEnum = pgEnum("notification_channel", [
  "push",
  "email",
  "in_app",
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  channel: notificationChannelEnum("channel").default("in_app").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  payload: jsonb("payload"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
