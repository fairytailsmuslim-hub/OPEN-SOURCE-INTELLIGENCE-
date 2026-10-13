const Leaderboard = require('../models/Leaderboard');

async function getTop(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const rows = await Leaderboard.find({})
    .sort({ score: -1 })
    .limit(limit)
    .populate('userId', 'displayName countryCode')
    .lean();

  return res.json(
    rows.map((r, i) => ({
      rank: i + 1,
      name: r.userId?.displayName || 'Anonymous',
      country: r.countryCode || r.userId?.countryCode,
      score: r.score,
      tier: r.tierProgress?.current || 1,
    }))
  );
}

async function getMyRank(req, res) {
  const me = await Leaderboard.findOne({ userId: req.user.id }).lean();
  if (!me) return res.json({ score: 0, rank: null });
  const higher = await Leaderboard.countDocuments({ score: { $gt: me.score } });
  return res.json({ score: me.score, rank: higher + 1, tier: me.tierProgress });
}

module.exports = { getTop, getMyRank };