const maxmind = require('maxmind');
const path = require('path');

let lookup = null;

async function initGeoIP() {
  // GeoLite2-Country.mmdb file download karke server pe rakhein
  lookup = await maxmind.open(path.join(__dirname, '../data/GeoLite2-Country.mmdb'));
}

function getCountryFromIP(ip) {
  if (!lookup) return null;
  try {
    // IPv6-mapped IPv4 handle karo
    const cleanIP = ip.replace(/^::ffff:/, '');
    const result = lookup.get(cleanIP);
    return result?.country?.iso_code || null;
  } catch {
    return null;
  }
}

module.exports = { initGeoIP, getCountryFromIP };