const crypto = require('crypto');

const HMAC_KEY = Buffer.from(process.env.AUDIT_HMAC_KEY, 'hex');

/**
 * Audit log entry ko HMAC-SHA256 se sign karta hai.
 * Har log entry immutable proof ke saath store hoti hai.
 */
function signAuditPayload(payload) {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHmac('sha256', HMAC_KEY).update(canonical).digest('hex');
}

/**
 * Flag submission ke liye deterministic hash.
 * Same user + same flag = same hash (replay detection ke liye).
 */
function hashFlag(userId, flagValue) {
  return crypto
    .createHash('sha256')
    .update(`${userId}:${flagValue}:${process.env.AUDIT_HMAC_KEY}`)
    .digest('hex');
}

/**
 * Daily Merkle root — external timestamp anchoring ke liye.
 */
function computeMerkleRoot(hashes) {
  if (hashes.length === 0) return null;
  let layer = hashes.slice();
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] || left;
      next.push(
        crypto.createHash('sha256').update(left + right).digest('hex')
      );
    }
    layer = next;
  }
  return layer[0];
}

module.exports = { signAuditPayload, hashFlag, computeMerkleRoot };