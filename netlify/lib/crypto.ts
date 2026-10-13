import crypto from "node:crypto";
import { getHmacKey } from "./secrets.js";

const hmac = async (data: string) =>
  crypto.createHmac("sha256", await getHmacKey()).update(data).digest("hex");

/** Flags are compared case-insensitively and ignoring surrounding whitespace. */
export const normalizeFlag = (flag: string) => flag.trim().toLowerCase();

/** Per-user keyed flag hash — plaintext flags are never stored. */
export const hashFlag = (userId: string, flag: string) => hmac(`flag:${userId}:${normalizeFlag(flag)}`);

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Signs an audit entry using a canonical (sorted-key) JSON representation. */
export function signAuditPayload(entry: Record<string, unknown>) {
  const sorted = Object.fromEntries(Object.keys(entry).sort().map((k) => [k, entry[k]]));
  return hmac(JSON.stringify(sorted));
}

/** Deterministic certificate id for a user + tier, unforgeable without the server key. */
export const certIdFor = async (userId: string, tier: number) =>
  (await hmac(`cert:${userId}:${tier}`)).slice(0, 16);
