const config = require('./index');

let client = null;

async function connectRedis() {
  if (!config.redis.enabled) {
    console.log('Redis disabled. Caching will use in-memory fallback.');
    return;
  }
  try {
    const Redis = require('ioredis');
    client = new Redis(config.redis.url);
    client.on('error', (err) => {
      console.warn('Redis connection error:', err.message);
    });
    await client.ping();
    console.log('Redis connected');
  } catch (err) {
    console.warn('Redis unavailable, using in-memory cache fallback.');
    client = null;
  }
}

function getClient() {
  return client;
}

module.exports = { connectRedis, getClient };
