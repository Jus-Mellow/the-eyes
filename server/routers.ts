import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { connections } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createConnection,
  ensurePartnerCode,
  findUserByPartnerCode,
  getConnectionBetween,
  getConnectionForUser,
  getDb,
  getLatestLocation,
  getUserById,
  saveLocation,
  updateConnectionStatus,
  updateSharingPreferences,
} from "./db";
import { canViewPartnerLocation, canWriteLocation, normalizePartnerCode } from "./eye.policy";

function requireAccepted(status: string | undefined) {
  if (status !== "accepted") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Accept a connection before sharing location." });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  connection: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const me = await getUserById(ctx.user.id);
      const code = await ensurePartnerCode(ctx.user.id);
      const connection = await getConnectionForUser(ctx.user.id);
      const partnerId = connection
        ? connection.userId === ctx.user.id
          ? connection.partnerId
          : connection.userId
        : undefined;
      const partner = partnerId ? await getUserById(partnerId) : undefined;
      const partnerLocation = partnerId && connection?.status === "accepted" && partner?.locationSharingEnabled && !partner?.sharingPaused
        ? await getLatestLocation(partnerId, true)
        : undefined;
      return {
        partnerCode: code ?? me?.partnerCode ?? null,
        connection: connection
          ? { id: connection.id, status: connection.status, requestedBy: connection.requestedBy, createdAt: connection.createdAt, updatedAt: connection.updatedAt }
          : null,
        partner: partner
          ? { id: partner.id, name: partner.name, email: partner.email, locationSharingEnabled: partner.locationSharingEnabled, sharingPaused: partner.sharingPaused, shareExactLocation: partner.shareExactLocation }
          : null,
        sharing: { enabled: Boolean(me?.locationSharingEnabled), paused: Boolean(me?.sharingPaused), exact: Boolean(me?.shareExactLocation) },
        partnerLocation: partnerLocation && canViewPartnerLocation(connection?.status, Boolean(partner?.locationSharingEnabled) && !partner?.sharingPaused)
          ? { latitude: partner?.shareExactLocation ? partnerLocation.latitude : Number(partnerLocation.latitude.toFixed(2)), longitude: partner?.shareExactLocation ? partnerLocation.longitude : Number(partnerLocation.longitude.toFixed(2)), accuracy: partnerLocation.accuracy, updatedAt: partnerLocation.updatedAt }
          : null,
      };
    }),

    request: protectedProcedure.input(z.object({ partnerCode: z.string().min(4).max(16) })).mutation(async ({ ctx, input }) => {
      const code = normalizePartnerCode(input.partnerCode);
      const target = await findUserByPartnerCode(code);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "No person found with that Eye code." });
      if (target.id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot connect the Eye to itself." });
      const existing = await getConnectionBetween(ctx.user.id, target.id);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "A connection request already exists between you." });
      await createConnection(ctx.user.id, target.id);
      return { success: true } as const;
    }),

    respond: protectedProcedure.input(z.object({ connectionId: z.number().int().positive(), decision: z.enum(["accepted", "declined"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const result = await db.select().from(connections).where(and(eq(connections.id, input.connectionId), eq(connections.partnerId, ctx.user.id))).limit(1);
      const connection = result[0];
      if (!connection || connection.status !== "pending") throw new TRPCError({ code: "NOT_FOUND", message: "That connection request is no longer active." });
      await updateConnectionStatus(connection.id, input.decision);
      return { success: true } as const;
    }),

    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      const connection = await getConnectionForUser(ctx.user.id);
      if (!connection || connection.status !== "accepted") return { success: true } as const;
      await updateConnectionStatus(connection.id, "disconnected");
      await updateSharingPreferences(ctx.user.id, { locationSharingEnabled: false, sharingPaused: false });
      return { success: true } as const;
    }),
  }),

  privacy: router({
    update: protectedProcedure.input(z.object({ enabled: z.boolean().optional(), exact: z.boolean().optional(), paused: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
      const connection = await getConnectionForUser(ctx.user.id);
      if ((input.enabled === true || input.paused === false) && connection?.status !== "accepted") requireAccepted(connection?.status);
      await updateSharingPreferences(ctx.user.id, {
        ...(input.enabled === undefined ? {} : { locationSharingEnabled: input.enabled }),
        ...(input.exact === undefined ? {} : { shareExactLocation: input.exact }),
        ...(input.paused === undefined ? {} : { sharingPaused: input.paused }),
      });
      return { success: true } as const;
    }),
  }),

  location: router({
    push: protectedProcedure.input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().nonnegative().optional() })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      const connection = await getConnectionForUser(ctx.user.id);
      const sharingEnabled = Boolean(user?.locationSharingEnabled) && !Boolean(user?.sharingPaused);
      if (!canWriteLocation(connection?.status, sharingEnabled)) requireAccepted(connection?.status);
      if (!sharingEnabled) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Location sharing is currently off." });
      await saveLocation(ctx.user.id, input.latitude, input.longitude, input.accuracy, true);
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
