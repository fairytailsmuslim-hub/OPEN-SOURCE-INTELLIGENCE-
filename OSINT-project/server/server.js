require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const passport = require('passport');

const { initGeoIP } = require('./utils/geoip');
const { geofence, requireAllowedRegion } = require('./middleware/geofence');
const { globalLimiter, ipLimiter, burstLimiter } = require('./middleware/rateLimiter');
const { oauthCallback, logout, requireAuth, passport: p } = require('./controllers/authController');
const { shodanHost, censysSearch, proxyLimiter } = require('./controllers/proxyIntel');

const app = express();

// ---------- Security Armor ----------
app.set('trust proxy', 1); // reverse proxy ke peeche correct IP ke liye
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // React inline styles
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.CLIENT_URL],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// ---------- Global Limiters ----------
app.use(globalLimiter);
app.use(ipLimiter);
app.use(burstLimiter);

// ---------- Geofence Layer ----------
app.use(geofence);

// ---------- Passport ----------
app.use(passport.initialize());
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const User = require('./models/User');
  const u = await User.findById(id);
  done(null, u);
});

// ---------- Routes ----------
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
app.get('/api/auth/google/callback', oauthCallback);
app.post('/api/auth/logout', requireAuth, logout);

// OSINT proxy routes — auth + region check dono
app.get('/api/proxy/shodan/host/:ip',
  requireAuth, requireAllowedRegion, proxyLimiter, shodanHost
);
app.post('/api/proxy/censys/search',
  requireAuth, requireAllowedRegion, proxyLimiter, censysSearch
);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    geo: req.geo,
    ts: new Date().toISOString(),
  });
});

// ---------- Error Handler ----------
app.use((err, req, res, next) => {
  console.error('UNHANDLED', err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

// ---------- Bootstrap ----------
async function bootstrap() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    await initGeoIP();
    console.log('GeoIP loaded');

    app.listen(process.env.PORT, () => {
      console.log(`Server on ${process.env.PORT}`);
    });
  } catch (err) {
    console.error('BOOTSTRAP_FAILED', err);
    process.exit(1);
  }
}

bootstrap();

module.exports = app;