import {
  pgTable, serial, text, timestamp, integer, boolean, jsonb, uniqueIndex, index,
} from "drizzle-orm/pg-core";

// One row per Netlify Identity user (id = Identity user id)
export const profiles = pgTable("profiles", {
  id: text().primaryKey(),
  email: text().notNull(),
  displayName: text("display_name"),
  role: text().notNull().default("user"),
  countryCode: text("country_code"),
  regionRestricted: boolean("region_restricted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const leaderboard = pgTable("leaderboard", {
  userId: text("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  score: integer().notNull().default(0),
  countryCode: text("country_code"),
  currentTier: integer("current_tier").notNull().default(1),
  completedTiers: integer("completed_tiers").array().notNull().default([]),
  completedRooms: text("completed_rooms").array().notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("leaderboard_score_idx").on(t.score)]);

// Per-user challenge instance. Plaintext flag is never stored.
export const roomSeeds = pgTable("room_seeds", {
  id: serial().primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  roomId: text("room_id").notNull(),
  mode: text().notNull().default("simulated"),
  targetIp: text("target_ip"),
  targetHash: text("target_hash"),
  clues: jsonb().notNull().default({}),
  flagHash: text("flag_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("room_seeds_user_room_idx").on(t.userId, t.roomId)]);

export const certificates = pgTable("certificates", {
  certId: text("cert_id").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text().notNull(),
  tier: integer().notNull(),
  score: integer().notNull(),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("certificates_user_tier_idx").on(t.userId, t.tier)]);

// Append-only, HMAC hash-chained audit trail
export const auditLogs = pgTable("audit_logs", {
  id: serial().primaryKey(),
  eventType: text("event_type").notNull(),
  userId: text("user_id"),
  ip: text(),
  countryCode: text("country_code"),
  payload: jsonb(),
  hmac: text().notNull(),
  prevHash: text("prev_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("audit_logs_user_event_idx").on(t.userId, t.eventType, t.createdAt),
]);

// Server-side secrets generated on first use (used when AUDIT_HMAC_KEY env var is not set)
export const appSecrets = pgTable("app_secrets", {
  name: text().primaryKey(),
  value: text().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
