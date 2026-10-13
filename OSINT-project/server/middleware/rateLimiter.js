const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

const mongoStore = () =>
  new MongoStore({
    uri: process.env.MONGO_URI,
    expireTimeMs: 60 * 60 * 1000,
  });

// Global safety net — DoS se bachne ke liye
const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100000,
  store: mongoStore(),
  standardHeaders: true,
  message: { error: 'GLOBAL_RATE_LIMIT' },
});

// Per-IP — ek IP se abuse rokne ke liye
const ipLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 500,
  store: mongoStore(),
  keyGenerator: (req) => req.geo?.ip || req.ip,
  message: { error: 'IP_RATE_LIMIT' },
});

// Per-user — authenticated users ke liye
const userLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2000,
  store: mongoStore(),
  keyGenerator: (req) => req.user?.id || req.geo?.ip,
  message: { error: 'USER_RATE_LIMIT' },
});

// Burst protection — 10 sec mein max 20 requests
const burstLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 20,
  store: mongoStore(),
  message: { error: 'BURST_LIMIT' },
});

module.exports = { globalLimiter, ipLimiter, userLimiter, burstLimiter };