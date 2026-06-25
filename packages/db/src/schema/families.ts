import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const familyRoleEnum = pgEnum("family_role", [
  "owner",
  "parent",
  "adult",
  "child",
  "guest",
]);

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "premium",
  "family_plus",
]);

export const memberStatusEnum = pgEnum("member_status", [
  "active",
  "invited",
  "removed",
]);

export const invitationChannelEnum = pgEnum("invitation_channel", [
  "email",
  "sms",
  "link",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firebaseUid: text("firebase_uid").notNull(),
    email: text("email"),
    displayName: text("display_name"),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    firebaseUidIdx: uniqueIndex("users_firebase_uid_idx").on(table.firebaseUid),
  }),
);

export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  subscriptionTier: subscriptionTierEnum("subscription_tier")
    .default("free")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const familyMembers = pgTable(
  "family_members",
  {
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: familyRoleEnum("role").notNull(),
    points: integer("points").default(0).notNull(),
    status: memberStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex("family_members_pk").on(table.familyId, table.userId),
  }),
);

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  channel: invitationChannelEnum("channel").notNull(),
  destination: text("destination"),
  role: familyRoleEnum("role").notNull(),
  token: text("token").notNull(),
  status: invitationStatusEnum("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
