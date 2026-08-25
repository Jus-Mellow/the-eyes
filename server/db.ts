import { and, desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { connections, InsertUser, locations, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

function makePartnerCode(userId: number) {
  const suffix = userId.toString(36).toUpperCase().padStart(4, "0").slice(-4);
  return `EYE-${suffix}`;
}

export async function ensurePartnerCode(userId: number) {
  const db = await getDb();
  if (!db) return `EYE-${userId.toString(36).toUpperCase().padStart(4, "0").slice(-4)}`;
  const user = await getUserById(userId);
  if (!user) return undefined;
  if (user.partnerCode) return user.partnerCode;
  const code = makePartnerCode(userId);
  await db.update(users).set({ partnerCode: code }).where(eq(users.id, userId));
  return code;
}

export async function getConnectionForUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(connections)
    .where(or(eq(connections.userId, userId), eq(connections.partnerId, userId)))
    .orderBy(desc(connections.updatedAt))
    .limit(1);
  return result[0];
}

export async function getConnectionBetween(userA: number, userB: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(connections)
    .where(
      and(
        or(and(eq(connections.userId, userA), eq(connections.partnerId, userB)), and(eq(connections.userId, userB), eq(connections.partnerId, userA))),
        or(eq(connections.status, "pending"), eq(connections.status, "accepted")),
      ),
    )
    .orderBy(desc(connections.updatedAt))
    .limit(1);
  return result[0];
}

export async function findUserByPartnerCode(partnerCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.partnerCode, partnerCode)).limit(1);
  return result[0];
}

export async function createConnection(userId: number, partnerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(connections).values({ userId, partnerId, requestedBy: userId, status: "pending" });
  return result;
}

export async function updateConnectionStatus(connectionId: number, status: "accepted" | "declined" | "disconnected") {
  const db = await getDb();
  if (!db) return;
  await db.update(connections).set({ status }).where(eq(connections.id, connectionId));
}

export async function updateSharingPreferences(userId: number, values: { locationSharingEnabled?: boolean; shareExactLocation?: boolean; sharingPaused?: boolean }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(values).where(eq(users.id, userId));
}

export async function saveLocation(userId: number, latitude: number, longitude: number, accuracy: number | undefined, sharingEnabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.insert(locations).values({ userId, latitude, longitude, accuracy, sharingEnabled });
}

export async function getLatestLocation(userId: number, onlyWhenSharing = true) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = onlyWhenSharing
    ? and(eq(locations.userId, userId), eq(locations.sharingEnabled, true))
    : eq(locations.userId, userId);
  const result = await db.select().from(locations).where(conditions).orderBy(desc(locations.updatedAt)).limit(1);
  return result[0];
}
