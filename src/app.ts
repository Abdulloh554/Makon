import express, { type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import mongoSanitize from 'express-mongo-sanitize'
import { config } from './config'
import { rateLimit } from './middleware/rateLimit'
import { errorHandler } from './middleware/errorHandler'
import * as Sentry from '@sentry/node'
import { clearAllData } from './lib/model'

import authRoutes from './modules/auth/auth.routes'
import propertiesRoutes from './modules/property/property.routes'
import sellersRoutes from './modules/seller/seller.routes'
import reviewsRoutes from './modules/review/review.routes'
import messagesRoutes from './modules/message/message.routes'
import paymentRoutes from './modules/payment/payment.routes'
import telegramRoutes from './modules/telegram/telegram.routes'
import adminRoutes from './modules/admin/admin.routes'

const app = express()

app.set('etag', false)
app.disable('x-powered-by')

if (config.sentry.enabled) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.nodeEnv,
    tracesSampleRate: config.isProduction ? 0.1 : 1.0,
  })
}

app.use(helmet({
  contentSecurityPolicy: config.isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org", "https://picsum.photos", "https://res.cloudinary.com"],
      connectSrc: ["'self'", ...(config.isProduction ? [] : ["http://localhost:3000"])],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}))
app.use(cors({
  origin: config.cors.origin === '*' ? true : config.cors.origin.split(',').map(s => s.trim()),
  credentials: true,
}))
app.use(compression())
app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(morgan(config.isDev ? 'dev' : 'combined'))

// ─── Production: HTTPS redirect ───────────────────────────────────────
if (config.isProduction) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      res.redirect(`https://${req.hostname}${req.originalUrl}`)
      return
    }
    next()
  })
}

// ─── NoSQL Injection Protection ──────────────────────────────────────
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    if (config.isDev) {
      console.warn(`MongoSanitize: blocked key "${key}" in ${req.method} ${req.originalUrl}`)
    }
  },
}))

// ─── Rate Limiting ──────────────────────────────────────────────────
app.use('/api/', rateLimit)

// ─── API v1 Routes ──────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/properties', propertiesRoutes)
app.use('/api/v1/sellers', sellersRoutes)
app.use('/api/v1/reviews', reviewsRoutes)
app.use('/api/v1/messages', messagesRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/telegram', telegramRoutes)
app.use('/api/telegram', telegramRoutes)

// ─── Backward compat: old /api/* → /api/v1/* ────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/properties', propertiesRoutes)
app.use('/api/sellers', sellersRoutes)
app.use('/api/reviews', reviewsRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/admin', adminRoutes)

// ─── Reset All Data (development only) ─────────────────────────────
app.post('/api/reset', async (_req: Request, res: Response) => {
  if (!config.isDev) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Faqat development rejimida ruxsat etilgan.' } })
    return
  }
  await clearAllData()
  res.json({ success: true, data: { message: 'Barcha ma\'lumotlar o\'chirildi.' } })
})

// ─── Health Check ──────────────────────────────────────────────────
const startTime = Date.now()
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: '3.1.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      environment: config.nodeEnv,
    },
  })
})

// ─── 404 Handler ───────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  })
})

// ─── Error Handler ─────────────────────────────────────────────────
// Sentry error handler is integrated in the global error handler
app.use(errorHandler)

export default app
