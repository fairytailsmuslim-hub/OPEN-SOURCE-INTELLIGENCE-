import type { Context } from "@netlify/functions";

export interface Geo {
  ip: string | null;
  country: string | null;
  allowed: boolean;
  restricted: boolean;
}

const allowedCountries = () =>
  (process.env.ALLOWED_COUNTRIES || "PK,PS")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

/**
 * Soft geofence: allowed countries get full access, everyone else gets
 * read-only "restricted" mode. Set ALLOWED_COUNTRIES="*" to allow everyone,
 * or GEOFENCE_STRICT=true to hard-block other regions.
 */
export function getGeo(context: Context): Geo {
  const country = context.geo?.country?.code?.toUpperCase() || null;
  const list = allowedCountries();
  const allowed = list.includes("*") || (!!country && list.includes(country));
  return { ip: context.ip || null, country, allowed, restricted: !allowed };
}

export const isStrictGeofence = () => process.env.GEOFENCE_STRICT === "true";
