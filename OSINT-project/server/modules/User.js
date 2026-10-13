const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  displayName: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  countryCode: { type: String, length: 2 },
  regionRestricted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: Date,
}, { versionKey: false });

module.exports = mongoose.model('User', UserSchema);