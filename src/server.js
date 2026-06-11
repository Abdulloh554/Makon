require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./lib/logger');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { rateLimit } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const propertiesRoutes = require('./modules/property/property.routes');
const sellersRoutes = require('./modules/seller/seller.routes');
const messagesRoutes = require('./modules/message/message.routes');

const app = express();

// ─── Security & parsing ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// ─── Rate limiting ──────────────────────────────────────────────────
app.use('/api/', rateLimit);

// ─── Database & cache ────────────────────────────────────────────────
connectDB();
connectRedis();

// ─── API Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/sellers', sellersRoutes);
app.use('/api/messages', messagesRoutes);

// ─── Health check ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Joybor Backend API running', version: '2.1.0' });
});

// ─── Reset all data (development only) ─────────────────────────────
const { clearAllData } = require('./lib/model');
app.post('/api/reset', (req, res) => {
  if (!config.isDev) {
    return res.status(403).json({ error: 'Faqat development rejimida ruxsat etilgan.' });
  }
  clearAllData();
  res.json({ message: 'Barcha ma\'lumotlar o\'chirildi.' });
});

// ─── 404 handler ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Error handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ─── Health check ───────────────────────────────────
const startTime = Date.now();
app.get('/health', (req, res) => {
  let dbStatus = 'unknown';
  try {
    dbStatus = usingMemory() ? 'in-memory' : (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected');
  } catch { dbStatus = 'unknown'; }

  res.json({
    status: 'ok',
    version: '2.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    db: dbStatus,
    environment: config.nodeEnv,
  });
});

// ─── Start server ───────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port} [${config.nodeEnv}]`);
});

function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    const db = require('./config/database');
    if (db.closeDB) db.closeDB();
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
