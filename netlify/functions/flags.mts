import type { Config, Context } from "@netlify/functions";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { auditLogs, leaderboard, roomSeeds } from "../../db/schema.js";
import { requireSession, regionGuard } from "../lib/auth.js";
import { writeAudit } from "../lib/audit.js";
import { hashFlag, safeEqual } from "../lib/crypto.js";
import { error, json, readJson } from "../lib/http.js";
import { MAX_TIER, ROOMS } from "../lib/rooms.js";

const MAX_ATTEMPTS_PER_MINUTE = 10;

export default async (req: Request, context: Context) => {
  const session = await requireSession(context);
  if (session instanceof Response) return session;
  const blocked = regionGuard(session);
  if (blocked) return blocked;

  const body = await readJson<{ roomId?: unknown; flag?: unknown }>(req);
  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  const flag = typeof body?.flag === "string" ? body.flag : "";
  const room = ROOMS[roomId];
  if (!room || !flag.trim() || flag.length > 200) return error("INVALID_INPUT", 400);

  const { userId } = session;
  const audit = { userId, ip: session.geo.ip, country: session.geo.country };

  // Brute-force protection
  const [{ attempts }] = await db
    .select({ attempts: count() })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.userId, userId),
      eq(auditLogs.eventType, "FLAG_SUBMIT"),
      gt(auditLogs.createdAt, new Date(Date.now() - 60_000)),
    ));
  if (attempts >= MAX_ATTEMPTS_PER_MINUTE) return error("TOO_MANY_ATTEMPTS", 429);

  const [seed] = await db
    .select()
    .from(roomSeeds)
    .where(and(eq(roomSeeds.userId, userId), eq(roomSeeds.roomId, roomId)));
  if (!seed) return error("ROOM_NOT_STARTED", 404);
  if (seed.expiresAt < new Date()) return error("ROOM_EXPIRED", 410);

  const submittedHash = await hashFlag(userId, flag);
  const correct = safeEqual(submittedHash, seed.flagHash);
  let awarded = 0;

  if (correct) {
    const [progress] = await db.select().from(leaderboard).where(eq(leaderboard.userId, userId));
    const firstSolve = !progress?.completedRooms.includes(roomId);
    if (firstSolve) {
      awarded = room.points;
      const completedTiers = Array.from(new Set([...(progress?.completedTiers ?? []), room.tier])).sort();
      const currentTier = Math.min(Math.max(...completedTiers) + 1, MAX_TIER);
      await db
        .update(leaderboard)
        .set({
          score: sql`${leaderboard.score} + ${awarded}`,
          completedTiers,
          completedRooms: [...(progress?.completedRooms ?? []), roomId],
          currentTier,
          countryCode: session.geo.country,
          updatedAt: new Date(),
        })
        .where(eq(leaderboard.userId, userId));
    }
    // Consume the seed so the same instance can't be replayed
    await db.delete(roomSeeds).where(eq(roomSeeds.id, seed.id));
  }

  await writeAudit(audit, "FLAG_SUBMIT", { roomId, correct, flagHash: submittedHash });

  return json({ correct, awarded, tier: room.tier });
};

export const config: Config = {
  path: "/api/flags/submit",
  method: "POST",
};
