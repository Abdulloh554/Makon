/**
 * @file app.ts
 * @layer Application
 * @responsibility Express application setup — middleware stack, route mounting, error handling
 */

import crypto from 'node:crypto'
import express, { type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import mongoSanitize from 'express-mongo-sanitize'
import { config } from './config'
import { errorHandler } from './middleware/error.middleware'
// import { doubleCsrfProtection } from './middleware/csrf.middleware'
import { rateLimiter } from './middleware/rate-limit.middleware'

import authRoutes from './modules/auth/auth.routes'
import propertiesRoutes from './modules/property/property.routes'
import sellersRoutes from './modules/seller/seller.routes'
import messagesRoutes from './modules/message/message.routes'
import paymentRoutes from './modules/payment/payment.routes'
import adminRoutes from './modules/admin/admin.routes'
import imageRoutes from './modules/image/image.routes'
import path from 'node:path'

const app = express()

app.disable('x-powered-by')
app.set('etag', false)

// ─── Helmet (Security Headers) ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  crossOriginEmbedderPolicy: false,
}))

// ─── CORS ────────────────────────────────────────────────────────────
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-ID'],
}))

// ─── Compression ─────────────────────────────────────────────────────
app.use(compression())

// ─── Body Parsing ────────────────────────────────────────────────────
// Upload routes need larger limit for base64 image data
app.use('/api/v1/images/upload', express.json({ limit: '10mb' }))
app.use('/api/v1/payments/webhook/stripe', express.raw({ type: 'application/json' }))
// All other routes: 1mb limit prevents oversized payload attacks
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// ─── Cookie Parser ───────────────────────────────────────────────────
app.use(cookieParser())

// ─── NoSQL Injection Protection ──────────────────────────────────────
app.use(mongoSanitize({
  replaceWith: '_',
}))

// ─── Global Rate Limiter ─────────────────────────────────────────────
app.use('/api/v1/', rateLimiter('api'))

// ─── Request ID ──────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: () => void) => {
  req.requestId = crypto.randomUUID()
  next()
})

// ─── Static: Uploaded Files ──────────────────────────────────────────
app.use('/api/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

// ─── API v1 Routes ──────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/properties', propertiesRoutes)
app.use('/api/v1/sellers', sellersRoutes)
app.use('/api/v1/messages', messagesRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/images', imageRoutes)

// ─── Health Check ────────────────────────────────────────────────────
const startTime = Date.now()
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: '4.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      environment: config.nodeEnv,
    },
  })
})

// ─── 404 Handler ─────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  })
})

// ─── Global Error Handler ────────────────────────────────────────────
app.use(errorHandler)

export default app
