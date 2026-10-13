import type { Config, Context } from "@netlify/functions";
import { count, desc, eq, gt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { leaderboard, profiles } from "../../db/schema.js";
import { requireSession } from "../lib/auth.js";
import { json } from "../lib/http.js";

export default async (req: Request, context: Context) => {
  const session = await requireSession(context);
  if (session instanceof Response) return session;

  // GET /api/leaderboard/me
  if (new URL(req.url).pathname.endsWith("/me")) {
    const [me] = await db.select().from(leaderboard).where(eq(leaderboard.userId, session.userId));
    if (!me) return json({ score: 0, rank: null, tier: 1, completedTiers: [] });
    const [{ higher }] = await db
      .select({ higher: count() })
      .from(leaderboard)
      .where(gt(leaderboard.score, me.score));
    return json({ score: me.score, rank: higher + 1, tier: me.currentTier, completedTiers: me.completedTiers });
  }

  // GET /api/leaderboard?limit=50
  const limit = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get("limit") || "") || 50, 1), 100);
  const rows = await db
    .select({
      userId: leaderboard.userId,
      score: leaderboard.score,
      tier: leaderboard.currentTier,
      lbCountry: leaderboard.countryCode,
      name: profiles.displayName,
      country: profiles.countryCode,
    })
    .from(leaderboard)
    .innerJoin(profiles, eq(profiles.id, leaderboard.userId))
    .orderBy(desc(leaderboard.score), leaderboard.updatedAt)
    .limit(limit);

  return json(
    rows.map((r, i) => ({
      rank: i + 1,
      name: r.name || "Anonymous",
      country: r.lbCountry || r.country || null,
      score: r.score,
      tier: r.tier,
      isMe: r.userId === session.userId,
    }))
  );
};

export const config: Config = {
  path: ["/api/leaderboard", "/api/leaderboard/me"],
  method: "GET",
};
