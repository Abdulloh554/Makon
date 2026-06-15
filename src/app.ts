import express, { type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'

import { config } from './config'
import { rateLimit } from './middleware/rateLimit'
import { errorHandler } from './middleware/errorHandler'
import { clearAllData } from './lib/model'

import authRoutes from './modules/auth/auth.routes'
import propertiesRoutes from './modules/property/property.routes'
import sellersRoutes from './modules/seller/seller.routes'
import reviewsRoutes from './modules/review/review.routes'
import messagesRoutes from './modules/message/message.routes'

const app = express()

// ─── Security & Parsing ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: config.isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org", "https://picsum.photos"],
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
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(morgan(config.isDev ? 'dev' : 'combined'))

// ─── Rate Limiting ──────────────────────────────────────────────────
app.use('/api/', rateLimit)

// ─── API Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/properties', propertiesRoutes)
app.use('/api/sellers', sellersRoutes)
app.use('/api/reviews', reviewsRoutes)
app.use('/api/messages', messagesRoutes)

// ─── Reset All Data (development only) ─────────────────────────────
app.post('/api/reset', async (_req: Request, res: Response) => {
  if (!config.isDev) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Faqat development rejimida ruxsat etilgan.' } })
    return
  }
  await clearAllData()
  res.json({ success: true, data: { message: 'Barcha ma\'lumotlar o\'chirildi.' } })
})

// ─── Health Check ───────────────────────────────────────────────────
const startTime = Date.now()
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: '3.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      environment: config.nodeEnv,
    },
  })
})

// ─── 404 Handler ────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  })
})

// ─── Error Handler ──────────────────────────────────────────────────
app.use(errorHandler)

export default app
