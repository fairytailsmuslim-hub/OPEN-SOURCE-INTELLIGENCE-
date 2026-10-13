const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  eventType: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  ip: String,
  countryCode: String,
  payload: mongoose.Schema.Types.Mixed,
  hmac: { type: String, required: true }, // signature of payload
  prevHash: String, // hash chain
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false, capped: { size: 1073741824, max: 1000000 } });

// Capped collection = append-only, MongoDB automatically purges oldest
module.exports = mongoose.model('AuditLog', AuditLogSchema);