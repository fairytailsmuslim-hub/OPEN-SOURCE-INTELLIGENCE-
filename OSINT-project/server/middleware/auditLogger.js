const AuditLog = require('../models/AuditLog');
const { signAuditPayload } = require('../utils/crypto');

let lastHash = 'GENESIS';

async function writeAudit(req, eventType, payload) {
  const entry = {
    eventType,
    userId: req.user?.id,
    ip: req.geo?.ip,
    countryCode: req.geo?.country,
    payload,
    prevHash: lastHash,
    createdAt: new Date(),
  };
  entry.hmac = signAuditPayload(entry);
  lastHash = entry.hmac;

  try {
    await AuditLog.create(entry);
  } catch (err) {
    // Audit fail hone pe operation fail nahi karni — log karo
    console.error('AUDIT_WRITE_FAILED', err.message);
  }
}

function auditMiddleware(eventType) {
  return (req, res, next) => {
    res.on('finish', () => {
      writeAudit(req, eventType, {
        method: req.method,
        path: req.path,
        status: res.statusCode,
      });
    });
    next();
  };
}

module.exports = { writeAudit, auditMiddleware };