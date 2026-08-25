import { boolean, double, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the Manus auth flow plus THE EYE profile and privacy defaults. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  partnerCode: varchar("partnerCode", { length: 16 }).unique(),
  locationSharingEnabled: boolean("locationSharingEnabled").default(false).notNull(),
  shareExactLocation: boolean("shareExactLocation").default(false).notNull(),
  sharingPaused: boolean("sharingPaused").default(false).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const connections = mysqlTable("connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  partnerId: int("partnerId").notNull(),
  requestedBy: int("requestedBy").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "disconnected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userStatusIdx: index("connections_user_status_idx").on(table.userId, table.status),
  partnerStatusIdx: index("connections_partner_status_idx").on(table.partnerId, table.status),
}));

export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  latitude: double("latitude").notNull(),
  longitude: double("longitude").notNull(),
  accuracy: double("accuracy"),
  sharingEnabled: boolean("sharingEnabled").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userUpdatedIdx: index("locations_user_updated_idx").on(table.userId, table.updatedAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Connection = typeof connections.$inferSelect;
export type Location = typeof locations.$inferSelect;
