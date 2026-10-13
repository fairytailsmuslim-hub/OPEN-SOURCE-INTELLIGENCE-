const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  score: { type: Number, default: 0, index: -1 },
  countryCode: { type: String, length: 2, index: true },
  tierProgress: {
    current: { type: Number, default: 1 },
    completed: [Number],
  },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

LeaderboardSchema.index({ score: -1, countryCode: 1 });

module.exports = mongoose.model('Leaderboard', LeaderboardSchema);