import { desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { auditLogs } from "../../db/schema.js";
import { signAuditPayload } from "./crypto.js";

export interface AuditContext {
  userId?: string | null;
  ip?: string | null;
  country?: string | null;
}

/**
 * Appends a hash-chained audit entry. The previous hash is read from the
 * database (not memory) so the chain survives across serverless invocations.
 * Audit failures never fail the user-facing operation.
 */
export async function writeAudit(ctx: AuditContext, eventType: string, payload: Record<string, unknown> = {}) {
  try {
    const [last] = await db
      .select({ hmac: auditLogs.hmac })
      .from(auditLogs)
      .orderBy(desc(auditLogs.id))
      .limit(1);

    const createdAt = new Date();
    const entry = {
      eventType,
      userId: ctx.userId ?? null,
      ip: ctx.ip ?? null,
      countryCode: ctx.country ?? null,
      payload,
      prevHash: last?.hmac ?? "GENESIS",
      createdAt: createdAt.toISOString(),
    };
    const hmac = await signAuditPayload(entry);
    await db.insert(auditLogs).values({ ...entry, createdAt, hmac });
  } catch (err) {
    console.error("AUDIT_WRITE_FAILED", (err as Error).message);
  }
}
