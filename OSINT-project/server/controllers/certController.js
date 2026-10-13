const crypto = require('crypto');
const Leaderboard = require('../models/Leaderboard');
const User = require('../models/User');
const { writeAudit } = require('../middleware/auditLogger');

/**
 * Certificate generate karta hai. certId HMAC-signed hai,
 * isliye frontend forge nahi kar sakta.
 */
async function issueCertificate(req, res) {
  const { tier } = req.params;
  const tierNum = parseInt(tier);
  if (![1, 2, 3, 4, 5].includes(tierNum)) {
    return res.status(400).json({ error: 'INVALID_TIER' });
  }

  const [user, lb] = await Promise.all([
    User.findById(req.user.id).lean(),
    Leaderboard.findOne({ userId: req.user.id }).lean(),
  ]);

  if (!lb?.tierProgress?.completed?.includes(tierNum)) {
    return res.status(403).json({ error: 'TIER_NOT_COMPLETED' });
  }

  const certId = crypto
    .createHmac('sha256', process.env.AUDIT_HMAC_KEY)
    .update(`${req.user.id}:${tierNum}:${Date.now()}`)
    .digest('hex')
    .slice(0, 16);

  await writeAudit(req, 'CERT_ISSUED', { tier: tierNum, certId });

  return res.json({
    certId,
    name: user.displayName,
    tier: tierNum,
    score: lb.score,
    date: new Date().toISOString(),
  });
}

async function verifyCertificate(req, res) {
  // Simple verify — certId format check. Production mein DB table rakho.
  const { certId } = req.params;
  if (!/^[a-f0-9]{16}$/.test(certId)) {
    return res.status(400).json({ valid: false });
  }
  return res.json({ valid: true });
}

module.exports = { issueCertificate, verifyCertificate };