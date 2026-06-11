const config = require('../config');

const hits = new Map();

function rateLimit(req, res, next) {
  const key = req.ip + ':' + req.path;
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const max = config.rateLimit.max;

  if (!hits.has(key)) {
    hits.set(key, []);
  }

  const timestamps = hits.get(key).filter((t) => now - t < windowMs);
  timestamps.push(now);
  hits.set(key, timestamps);

  if (timestamps.length > max) {
    return res.status(429).json({
      error: `So'rovlar chegarasiga yetildi. ${Math.ceil(windowMs / 1000)} soniyadan keyin urinib ko'ring.`,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  next();
}

module.exports = { rateLimit };
