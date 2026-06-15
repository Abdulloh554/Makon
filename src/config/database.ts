import mongoose from 'mongoose'
import { config } from './index'
import { logger } from '../lib/logger'

let connected = false

export async function connectDB(): Promise<void> {
  if (config.isTest) return
  const retries = config.isProduction ? 3 : 1
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(config.mongodb.uri, {
        serverSelectionTimeoutMS: config.isProduction ? 10000 : 3000,
        heartbeatFrequencyMS: 10000,
      })
      logger.info('MongoDB connected', { uri: config.mongodb.uri })
      connected = true

      if (config.mongodb.useMongo) {
        await createIndexes()
      }
      return
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (attempt < retries) {
        logger.warn(`MongoDB connection attempt ${attempt}/${retries} failed, retrying...`, { error: msg })
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
      } else {
        if (config.isProduction) {
          logger.error('MongoDB connection failed in production — exiting.', { error: msg })
          process.exit(1)
        }
        logger.warn('MongoDB unavailable, using in-memory storage.', { error: msg })
        connected = false
      }
    }
  }
}

async function createIndexes(): Promise<void> {
  try {
    const db = mongoose.connection.db
    if (!db) return

    // Users collection indexes
    await db.collection('users').createIndex({ phone: 1 }, { unique: true })
    await db.collection('users').createIndex({ role: 1 })

    // Properties collection indexes
    await db.collection('properties').createIndex({ sellerId: 1 })
    await db.collection('properties').createIndex({ type: 1 })
    await db.collection('properties').createIndex({ dealType: 1 })
    await db.collection('properties').createIndex({ status: 1 })
    await db.collection('properties').createIndex({ price: 1 })
    await db.collection('properties').createIndex({ createdAt: -1 })
    await db.collection('properties').createIndex({ title: 'text', description: 'text' })

    // Sellers collection indexes
    await db.collection('sellers').createIndex({ userId: 1 }, { unique: true })

    // Messages collection indexes
    await db.collection('messages').createIndex({ fromUserId: 1, toUserId: 1 })
    await db.collection('messages').createIndex({ toUserId: 1, read: 1 })
    await db.collection('messages').createIndex({ createdAt: 1 })

    logger.info('Database indexes created successfully')
  } catch (err) {
    logger.warn('Failed to create indexes (non-fatal)', {
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

export function isConnected(): boolean {
  return connected
}

export async function closeDB(): Promise<void> {
  if (connected) {
    await mongoose.disconnect()
    logger.info('MongoDB disconnected')
    connected = false
  }
}

export function getMongoStatus(): string {
  try {
    if (config.mongodb.useMongo && mongoose.connection.readyState === 1) return 'connected'
    return 'in-memory'
  } catch {
    return 'unknown'
  }
}
