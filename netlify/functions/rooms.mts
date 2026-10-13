import type { Config, Context } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { leaderboard, roomSeeds } from "../../db/schema.js";
import { requireSession, regionGuard } from "../lib/auth.js";
import { writeAudit } from "../lib/audit.js";
import { hashFlag } from "../lib/crypto.js";
import { error, json } from "../lib/http.js";
import { ROOMS, isUnlocked, roomSummary } from "../lib/rooms.js";

export default async (req: Request, context: Context) => {
  const session = await requireSession(context);
  if (session instanceof Response) return session;
  const { userId } = session;

  const [progress] = await db.select().from(leaderboard).where(eq(leaderboard.userId, userId));
  const completedTiers = progress?.completedTiers ?? [];
  const completedRooms = progress?.completedRooms ?? [];
  const roomId = context.params.roomId;

  // GET /api/rooms — list all rooms with the user's progress
  if (!roomId) {
    return json(
      Object.entries(ROOMS).map(([id, room]) => ({
        ...roomSummary(id, room),
        unlocked: isUnlocked(room, completedTiers),
        completed: completedRooms.includes(id),
      }))
    );
  }

  const room = ROOMS[roomId];
  if (!room) return error("ROOM_NOT_FOUND", 404);
  const unlocked = isUnlocked(room, completedTiers);

  let [seed] = await db
    .select()
    .from(roomSeeds)
    .where(and(eq(roomSeeds.userId, userId), eq(roomSeeds.roomId, roomId)));
  const active = seed && seed.expiresAt > new Date() ? seed : undefined;

  // POST /api/rooms/:roomId/start — create (or reuse) a per-user dynamic seed
  if (req.method === "POST") {
    const blocked = regionGuard(session);
    if (blocked) return blocked;
    if (!unlocked) return error("ROOM_LOCKED", 403);

    if (!active) {
      const gen = room.generate();
      const values = {
        userId,
        roomId,
        mode: "simulated",
        targetIp: gen.targetIp,
        targetHash: gen.targetHash,
        clues: gen.clues,
        flagHash: await hashFlag(userId, gen.flag),
        expiresAt: new Date(Date.now() + room.durationSec * 1000),
        createdAt: new Date(),
      };
      [seed] = await db
        .insert(roomSeeds)
        .values(values)
        .onConflictDoUpdate({ target: [roomSeeds.userId, roomSeeds.roomId], set: values })
        .returning();
      await writeAudit({ userId, ip: session.geo.ip, country: session.geo.country }, "ROOM_START", { roomId });
    } else {
      seed = active;
    }
  } else if (!active) {
    seed = undefined;
  }

  return json({
    ...roomSummary(roomId, room),
    briefing: room.briefing,
    unlocked,
    completed: completedRooms.includes(roomId),
    restricted: session.geo.restricted,
    started: !!seed,
    expiresAt: seed?.expiresAt ?? null,
    mapNodes: seed ? room.nodes(seed) : [],
  });
};

export const config: Config = {
  path: ["/api/rooms", "/api/rooms/:roomId", "/api/rooms/:roomId/start"],
  method: ["GET", "POST"],
};
