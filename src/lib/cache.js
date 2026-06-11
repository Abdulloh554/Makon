const { getClient } = require('../config/redis');
const logger = require('./logger');

const memoryCache = new Map();
const DEFAULT_TTL = 300;

class Cache {
  async get(key) {
    const client = getClient();
    if (client) {
      try {
        const val = await client.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err) {
        logger.warn('Redis get error', { key, error: err.message });
      }
    }
    const mem = memoryCache.get(key);
    if (!mem) return null;
    if (mem.expires && Date.now() > mem.expires) {
      memoryCache.delete(key);
      return null;
    }
    return mem.data;
  }

  async set(key, data, ttl = DEFAULT_TTL) {
    const client = getClient();
    if (client) {
      try {
        await client.setex(key, ttl, JSON.stringify(data));
        return;
      } catch (err) {
        logger.warn('Redis set error', { key, error: err.message });
      }
    }
    memoryCache.set(key, { data, expires: Date.now() + ttl * 1000 });
  }

  async del(key) {
    const client = getClient();
    if (client) {
      try {
        await client.del(key);
        return;
      } catch (err) {
        logger.warn('Redis del error', { key, error: err.message });
      }
    }
    memoryCache.delete(key);
  }

  async delPattern(pattern) {
    const client = getClient();
    if (client) {
      try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) await client.del(...keys);
        return;
      } catch (err) {
        logger.warn('Redis delPattern error', { pattern, error: err.message });
      }
    }
    for (const key of memoryCache.keys()) {
      if (key.startsWith(pattern.replace('*', ''))) memoryCache.delete(key);
    }
  }

  async wrap(key, fn, ttl = DEFAULT_TTL) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const data = await fn();
    await this.set(key, data, ttl);
    return data;
  }
}

module.exports = new Cache();
