const mongoose = require('mongoose');

const DynamicSeedSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roomId: { type: String, required: true, index: true },
  mode: { type: String, enum: ['simulated', 'live'], default: 'simulated' },
  // Simulated mode: random target IPs/hashes (CTF style)
  targetIP: String,
  targetHash: String,
  // Live mode: reference to real feed entry (read-only, no PII)
  feedRef: String,
  flagHash: { type: String, required: true }, // HMAC hash, plaintext flag NEVER stored
  expiresAt: { type: Date, index: true },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

DynamicSeedSchema.index({ userId: 1, roomId: 1 }, { unique: true });
DynamicSeedSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('DynamicSeed', DynamicSeedSchema);