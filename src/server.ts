import dotenv from 'dotenv'
dotenv.config()

import { config } from './config'
import { logger } from './lib/logger'
import { connectDB, closeDB } from './config/database'
import { connectRedis } from './config/redis'

async function start(): Promise<void> {
  await connectDB()
  await connectRedis()

  // Dynamically import app AFTER DB connection, so mock flag is set
  // before createModel() is called during module loading
  const { seedPlans } = await import('./modules/payment/payment.service')
  const { default: app } = await import('./app')

  await seedPlans()

  logger.info('Database and Redis connected successfully', { environment: config.nodeEnv })

  if (!process.env.JEST_WORKER_ID) {
    const server = app.listen(config.port, () => {
      logger.info(`Server running on http://localhost:${config.port} [${config.nodeEnv}]`, {
        port: config.port,
        environment: config.nodeEnv,
        sentry: config.sentry.enabled ? 'enabled' : 'disabled',
      })
    })

    function shutdown(signal: string): void {
      logger.info(`${signal} received — shutting down gracefully...`, { signal })
      server.close(() => {
        logger.info('HTTP server closed')
        closeDB().catch((err) => {
          logger.error('Error closing database connection', { error: String(err) })
        })
        process.exit(0)
      })
      setTimeout(() => {
        logger.error('Forced shutdown after timeout')
        process.exit(1)
      }, 10_000)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection', { reason: String(reason) })
    })

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', { error: err.message, stack: err.stack })
      process.exit(1)
    })
  }
}

start()
