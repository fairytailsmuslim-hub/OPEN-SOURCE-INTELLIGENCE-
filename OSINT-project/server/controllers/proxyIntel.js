const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { writeAudit } = require('../middleware/auditLogger');

// Proxy-specific limiter — upstream APIs ki cost bachane ke liye
const proxyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'PROXY_RATE_LIMIT' },
});

/**
 * Shodan host lookup — token server-side rehta hai.
 */
async function shodanHost(req, res) {
  const { ip } = req.params;
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return res.status(400).json({ error: 'INVALID_IP' });
  }

  try {
    const { data } = await axios.get(
      `https://api.shodan.io/shodan/host/${ip}`,
      {
        params: { key: process.env.SHODAN_API_KEY },
        timeout: 10000,
      }
    );

    // Sanitize: sirf non-PII fields bhejo frontend ko
    const sanitized = {
      ip: data.ip_str,
      org: data.org,
      country: data.country_code,
      ports: data.ports,
      hostnames: data.hostnames,
      vulns: Object.keys(data.vulns || {}),
      lastUpdate: data.last_update,
    };

    await writeAudit(req, 'PROXY_SHODAN', { ip });
    return res.json(sanitized);
  } catch (err) {
    return res.status(err.response?.status || 500).json({
      error: 'UPSTREAM_ERROR',
      message: err.message,
    });
  }
}

/**
 * Censys search — basic wrapper.
 */
async function censysSearch(req, res) {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.length > 200) {
    return res.status(400).json({ error: 'INVALID_QUERY' });
  }

  try {
    const { data } = await axios.post(
      'https://search.censys.io/api/v2/hosts/search',
      { q: query, per_page: 10 },
      {
        auth: {
          username: process.env.CENSYS_API_ID,
          password: process.env.CENSYS_API_SECRET,
        },
        timeout: 10000,
      }
    );

    await writeAudit(req, 'PROXY_CENSYS', { query });
    return res.json({
      total: data.result?.total,
      hits: (data.result?.hits || []).map((h) => ({
        ip: h.ip,
        country: h.location?.country_code,
        services: h.services?.map((s) => s.port),
      })),
    });
  } catch (err) {
    return res.status(err.response?.status || 500).json({
      error: 'UPSTREAM_ERROR',
    });
  }
}

module.exports = { shodanHost, censysSearch, proxyLimiter };