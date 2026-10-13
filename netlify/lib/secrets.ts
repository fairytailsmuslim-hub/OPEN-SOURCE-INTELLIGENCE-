import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appSecrets } from "../../db/schema.js";

let cachedKey: Buffer | null = null;

/**
 * HMAC key for flags, certificates and the audit chain.
 * Uses AUDIT_HMAC_KEY when set; otherwise a random key is generated once
 * and persisted in the database so it survives across function invocations.
 */
export async function getHmacKey(): Promise<Buffer> {
  if (cachedKey) return cachedKey;

  const fromEnv = process.env.AUDIT_HMAC_KEY;
  if (fromEnv) {
    cachedKey = Buffer.from(fromEnv, /^[0-9a-f]+$/i.test(fromEnv) ? "hex" : "utf8");
    return cachedKey;
  }

  await db
    .insert(appSecrets)
    .values({ name: "hmac_key", value: crypto.randomBytes(32).toString("hex") })
    .onConflictDoNothing();
  const [row] = await db.select().from(appSecrets).where(eq(appSecrets.name, "hmac_key"));
  cachedKey = Buffer.from(row.value, "hex");
  return cachedKey;
}
