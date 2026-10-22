import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type {
  AvailabilityState,
  PollMode,
  RecurrenceRule,
  ScheduleType,
} from "@/lib/slotted-data";

export const polls = pgTable("polls", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  location: text("location").notNull().default(""),
  pollMode: text("poll_mode")
    .$type<PollMode>()
    .notNull()
    .default("dates_and_hours"),
  scheduleType: text("schedule_type")
    .$type<ScheduleType>()
    .notNull()
    .default("specific_dates"),
  recurrenceRule: jsonb("recurrence_rule")
    .$type<RecurrenceRule | null>()
    .default(null),
  hostClerkUserId: text("host_clerk_user_id"),
  hostTokenHash: text("host_token_hash").notNull(),
  hostName: text("host_name").notNull().default("Host"),
  timezone: text("timezone").notNull().default("America/New_York"),
  candidateDates: jsonb("candidate_dates").$type<string[]>().notNull(),
  dayStartHour: integer("day_start_hour").notNull().default(9),
  dayEndHour: integer("day_end_hour").notNull().default(17),
  slotMinutes: integer("slot_minutes").notNull().default(30),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  // Advanced Settings
  accessPasswordHash: text("access_password_hash"),
  visibilityMode: text("visibility_mode")
    .$type<"public" | "hidden_until_voted" | "host_only">()
    .notNull()
    .default("public"),
  allowIfNeeded: boolean("allow_if_needed").notNull().default(true),
  deadlineAt: text("deadline_at"),
  // Resolution state
  status: text("status").$type<"OPEN" | "LOCKED">().notNull().default("OPEN"),
  lockedSlotStart: text("locked_slot_start"),
  lockedSlotEnd: text("locked_slot_end"),
  lockedLocation: text("locked_location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollParticipants = pgTable(
  "poll_participants",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id"),
    guestSessionId: text("guest_session_id").notNull(),
    name: text("name").notNull(),
    city: text("city").notNull().default("NYC"),
    timezone: text("timezone").notNull().default("America/New_York"),
    avatarColor: text("avatar_color").notNull().default("#10B981"),
    slots: jsonb("slots")
      .$type<Record<string, AvailabilityState>>()
      .notNull()
      .default({}),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pollGuestIdx: uniqueIndex("poll_guest_idx").on(
      table.pollId,
      table.guestSessionId
    ),
  })
);

export const accessGrants = pgTable(
  "access_grants",
  {
    id: text("id").primaryKey(),
    slug: text("slug")
      .notNull()
      .references(() => polls.slug, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugTokenIdx: uniqueIndex("access_grant_slug_token_idx").on(
      table.slug,
      table.tokenHash
    ),
    slugIdx: index("access_grant_slug_idx").on(table.slug),
  })
);

export const recoveryCredentials = pgTable(
  "recovery_credentials",
  {
    id: text("id").primaryKey(),
    selector: text("selector").notNull().unique(),
    verifierHash: text("verifier_hash").notNull(),
    deviceHash: text("device_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (table) => ({
    deviceIdx: index("recovery_device_idx").on(table.deviceHash),
  })
);

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
