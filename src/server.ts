/**
 * @file server.ts
 * @layer Application
 * @responsibility Server entry point — starts HTTP server, connects DB + Redis, graceful shutdown
 */

import dotenv from 'dotenv'
dotenv.config()

import { config } from './config'
import { connectDatabase, disconnectDatabase } from './database/connection'
import { connectRedis, closeRedis } from './database/redis'

async function start(): Promise<void> {
  const { default: app } = await import('./app')

  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port} [${config.nodeEnv}]`)
  })

  // Connect to MongoDB
  try {
    await connectDatabase()
  } catch (err) {
    console.error('MongoDB connection failed:', err instanceof Error ? err.message : 'Unknown error')
  }

  // Connect to Redis
  if (config.redis.enabled) {
    try {
      await connectRedis()
    } catch (err) {
      console.error('Redis connection failed:', err instanceof Error ? err.message : 'Unknown error')
    }

    // BullMQ Workers
    try {
      const { createEmailWorker } = await import('./workers/email.worker')
      const { createMediaWorker } = await import('./workers/media.worker')
      const { createNotificationWorker } = await import('./workers/notification.worker')
      createEmailWorker()
      createMediaWorker()
      createNotificationWorker()
      console.log('BullMQ workers initialized')
    } catch (err) {
      console.warn('BullMQ workers initialization failed:', err instanceof Error ? err.message : 'Unknown error')
    }
  } else {
    console.log('Redis disabled — skipping Redis and BullMQ workers')
  }

  // Socket.IO
  try {
    const { initSocket } = await import('./services/socket')
    initSocket(server)
    console.log('Socket.IO initialized')
  } catch (err) {
    console.warn('Socket.IO initialization failed:', err instanceof Error ? err.message : 'Unknown error')
  }

  // Graceful shutdown
  function shutdown(signal: string): void {
    console.log(`${signal} received — shutting down gracefully...`)
    server.close(async () => {
      await disconnectDatabase()
      await closeRedis()
      process.exit(0)
    })
    setTimeout(() => {
      console.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10_000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason)
  })

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message)
    process.exit(1)
  })
}

start()
