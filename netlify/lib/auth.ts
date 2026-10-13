import type { Context } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { db } from "../../db/index.js";
import { leaderboard, profiles } from "../../db/schema.js";
import { error } from "./http.js";
import { getGeo, isStrictGeofence, type Geo } from "./geo.js";

export interface Session {
  userId: string;
  profile: typeof profiles.$inferSelect;
  geo: Geo;
}

/**
 * Resolves the signed-in Netlify Identity user, applies the geofence and
 * makes sure the user's profile and leaderboard rows exist.
 * Returns a Response when the request must be rejected.
 */
export async function requireSession(context: Context): Promise<Session | Response> {
  const geo = getGeo(context);
  if (geo.restricted && isStrictGeofence()) {
    return error("GEOFENCE_BLOCKED", 403, {
      message: "Sorry, you can not access this site from your region.",
      country: geo.country || "UNKNOWN",
    });
  }

  const user = await getUser();
  if (!user) return error("NO_SESSION", 401);

  const displayName = user.name?.trim() || user.email?.split("@")[0] || "Agent";
  const role = user.roles?.includes("admin") ? "admin" : "user";
  const now = new Date();

  const [profile] = await db
    .insert(profiles)
    .values({
      id: user.id,
      email: (user.email || "").toLowerCase(),
      displayName,
      role,
      countryCode: geo.country,
      regionRestricted: geo.restricted,
      lastLoginAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { displayName, role, countryCode: geo.country, regionRestricted: geo.restricted, lastLoginAt: now },
    })
    .returning();

  await db
    .insert(leaderboard)
    .values({ userId: user.id, countryCode: geo.country })
    .onConflictDoNothing();

  return { userId: user.id, profile, geo };
}

/** Guard for sensitive operations (flag submit, certificates, intel proxy). */
export function regionGuard(session: Session): Response | null {
  if (session.geo.restricted) {
    return error("REGION_RESTRICTED", 403, {
      message: "This action is not available in your region.",
    });
  }
  return null;
}
