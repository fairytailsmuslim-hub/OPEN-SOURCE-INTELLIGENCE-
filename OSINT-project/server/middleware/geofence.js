const { getCountryFromIP } = require('../utils/geoip');

const ALLOWED = (process.env.ALLOWED_COUNTRIES || 'PK,PS').split(',');
const STRICT = process.env.GEOFENCE_STRICT === 'true';

/**
 * SOFT geofence: Allowed countries ko full access.
 * Baaki countries ko restricted mode (read-only + step-up auth).
 * STRICT=true hone pe hard block.
 */
function geofence(req, res, next) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress;

  const country = getCountryFromIP(ip);
  req.geo = { ip, country, allowed: ALLOWED.includes(country) };

  if (req.geo.allowed) {
    return next();
  }

  if (STRICT) {
    return res.status(403).json({
      error: 'GEOFENCE_BLOCKED',
      message: 'Sorry you can not access this site.',
      country: country || 'UNKNOWN',
    });
  }

  // Soft mode: restricted flag attach karo, aage decision route pe
  req.geo.restricted = true;
  next();
}

/**
 * Restricted routes ke liye guard.
 * Sensitive operations (flag submit, admin) ke liye use karein.
 */
function requireAllowedRegion(req, res, next) {
  if (req.geo?.restricted) {
    return res.status(403).json({
      error: 'REGION_RESTRICTED',
      message: 'Sorry this is not valid for you cause of some reasons.',
    });
  }
  next();
}

module.exports = { geofence, requireAllowedRegion };