import { beforeEach, describe, expect, it, vi } from "vitest";
import { connections } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  ensurePartnerCode: vi.fn(),
  findUserByPartnerCode: vi.fn(),
  getConnectionBetween: vi.fn(),
  getConnectionForUser: vi.fn(),
  getDb: vi.fn(),
  getLatestLocation: vi.fn(),
  getUserById: vi.fn(),
  createConnection: vi.fn(),
  saveLocation: vi.fn(),
  updateConnectionStatus: vi.fn(),
  updateSharingPreferences: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";

const authUser = {
  id: 1,
  openId: "viewer",
  email: "viewer@example.com",
  name: "Viewer",
  loginMethod: "test",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext(user = authUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function acceptedConnection() {
  return { id: 17, userId: 1, partnerId: 2, requestedBy: 1, status: "accepted" as const, createdAt: new Date(), updatedAt: new Date() };
}

describe("THE EYE router privacy boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.ensurePartnerCode.mockResolvedValue("EYE-0001");
    dbMocks.getConnectionForUser.mockResolvedValue(undefined);
    dbMocks.getConnectionBetween.mockResolvedValue(undefined);
    dbMocks.getDb.mockResolvedValue(null);
  });

  it("persists a pending request to the target partner code", async () => {
    dbMocks.findUserByPartnerCode.mockResolvedValue({ id: 2, partnerCode: "EYE-0002" });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.connection.request({ partnerCode: " eye-0002 " })).resolves.toEqual({ success: true });
    expect(dbMocks.findUserByPartnerCode).toHaveBeenCalledWith("EYE-0002");
    expect(dbMocks.createConnection).toHaveBeenCalledWith(1, 2);
  });

  it("accepts and declines only a pending request addressed to the current user", async () => {
    const pending = { id: 21, userId: 1, partnerId: 2, requestedBy: 1, status: "pending" as const, createdAt: new Date(), updatedAt: new Date() };
    const limit = vi.fn().mockResolvedValue([pending]);
    dbMocks.getDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit }) }) }) });
    const caller = appRouter.createCaller(createContext({ ...authUser, id: 2, openId: "recipient" }));

    await expect(caller.connection.respond({ connectionId: 21, decision: "accepted" })).resolves.toEqual({ success: true });
    expect(dbMocks.updateConnectionStatus).toHaveBeenCalledWith(21, "accepted");

    await expect(caller.connection.respond({ connectionId: 21, decision: "declined" })).resolves.toEqual({ success: true });
    expect(dbMocks.updateConnectionStatus).toHaveBeenCalledWith(21, "declined");
    expect(limit).toHaveBeenCalledTimes(2);
    void connections;
  });

  it("disconnects the persisted connection and turns off the viewer’s sharing state", async () => {
    dbMocks.getConnectionForUser.mockResolvedValue(acceptedConnection());
    const caller = appRouter.createCaller(createContext());

    await expect(caller.connection.disconnect()).resolves.toEqual({ success: true });
    expect(dbMocks.updateConnectionStatus).toHaveBeenCalledWith(17, "disconnected");
    expect(dbMocks.updateSharingPreferences).toHaveBeenCalledWith(1, { locationSharingEnabled: false, sharingPaused: false });
  });

  it("allows a location write only when an accepted connection and sharing are both active", async () => {
    dbMocks.getConnectionForUser.mockResolvedValue(acceptedConnection());
    dbMocks.getUserById.mockResolvedValue({ ...authUser, locationSharingEnabled: true, sharingPaused: false });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.location.push({ latitude: 35.68, longitude: 139.76, accuracy: 12 })).resolves.toEqual({ success: true });
    expect(dbMocks.saveLocation).toHaveBeenCalledWith(1, 35.68, 139.76, 12, true);

    dbMocks.getConnectionForUser.mockResolvedValue({ ...acceptedConnection(), status: "pending" });
    await expect(caller.location.push({ latitude: 35.68, longitude: 139.76 })).rejects.toThrow("Accept a connection before sharing location.");
  });
});
