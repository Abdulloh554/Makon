import dotenv from 'dotenv'
dotenv.config()

import { config } from './config'
import { logger } from './lib/logger'
import { connectDB, closeDB } from './config/database'
import { connectRedis } from './config/redis'
import app from './app'

// ─── Database & Cache ────────────────────────────────────────────────
connectDB()
connectRedis()

// ─── Start Server ───────────────────────────────────────────────────
let server: ReturnType<typeof app.listen> | undefined
if (!process.env.JEST_WORKER_ID) {
  server = app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port} [${config.nodeEnv}]`)
  })
}

function shutdown(signal: string): void {
  logger.info(`${signal} received — shutting down gracefully...`)
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed')
      closeDB().catch(() => {})
      process.exit(0)
    })
  } else {
    closeDB().catch(() => {})
    process.exit(0)
  }
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10_000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export default app
