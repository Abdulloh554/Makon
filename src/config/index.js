require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/joybor',
    useMongo: process.env.USE_MONGO === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'makon_jwt_secret_key_2024_joybor',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    enabled: process.env.REDIS_ENABLED === 'true',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
};

module.exports = config;
