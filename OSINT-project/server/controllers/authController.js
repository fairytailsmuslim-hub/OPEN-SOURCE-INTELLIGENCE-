const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');
const { writeAudit } = require('../middleware/auditLogger');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) return done(new Error('NO_EMAIL'));

    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email,
        displayName: profile.displayName,
      });
      await Leaderboard.create({ userId: user._id });
    }
    user.lastLoginAt = new Date();
    await user.save();
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

/**
 * OAuth callback handler — geofence check yahan hoti hai.
 * Session truncated if region not allowed (soft mode mein restricted flag).
 */
function oauthCallback(req, res) {
  passport.authenticate('google', { session: false }, async (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }

    const country = req.geo?.country || null;
    const allowed = req.geo?.allowed || false;

    // Update user with geo info
    user.countryCode = country;
    user.regionRestricted = !allowed;
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        country,
        restricted: !allowed,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await writeAudit(
      { user, geo: req.geo },
      'AUTH_LOGIN',
      { country, allowed, restricted: !allowed }
    );

    // HttpOnly cookie mein token — XSS se bachne ke liye
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  })(req, res);
}

function logout(req, res) {
  res.clearCookie('session');
  return res.json({ ok: true });
}

/**
 * Auth middleware — JWT verify karta hai.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'NO_SESSION' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_SESSION' });
  }
}

module.exports = { oauthCallback, logout, requireAuth, passport };