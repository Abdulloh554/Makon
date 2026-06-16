import mongoose from 'mongoose'
import { config } from './index'
import { logger } from '../lib/logger'

const MAX_RETRIES = 3
const RETRY_BASE_MS = 2000

export const store = { useMock: false }

export async function connectDB(): Promise<void> {
  if (config.isTest) return

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(config.mongodb.uri, {
        serverSelectionTimeoutMS: 10_000,
        heartbeatFrequencyMS: 10_000,
      })
      logger.info('MongoDB connected', { uri: config.mongodb.uri })
      await createIndexes()
      return
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (attempt < MAX_RETRIES) {
        logger.warn(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed, retrying...`, { error: msg })
        await new Promise(resolve => setTimeout(resolve, RETRY_BASE_MS * attempt))
      } else if (config.isDev) {
        logger.warn('MongoDB unavailable — falling back to in-memory mock database')
        store.useMock = true
        await seedMockData()
        return
      } else {
        logger.error(`MongoDB connection failed after ${MAX_RETRIES} attempts — exiting.`, { error: msg })
        process.exit(1)
      }
    }
  }
}

async function seedMockData(): Promise<void> {
  const { createMockModel } = await import('../lib/mockdb')

  const users = createMockModel('User')
  await users.create({
    firstName: 'Admin',
    lastName: 'Makon',
    phone: '+998901234567',
    password: '$2a$10$mock', // won't work for login but shows structure
    role: 'admin',
  })

  const sellers = createMockModel('Seller')
  await sellers.create({
    name: 'Agent Demo',
    phone: '+998901234567',
    rating: 4.8,
    totalListings: 5,
  })

  const properties = createMockModel('Property')
  for (let i = 1; i <= 10; i++) {
    await properties.create({
      title: `${i} xonali kvartira Toshkent`,
      description: `Zamonaviy ${i} xonali kvartira.`,
      price: 30000 + i * 5000,
      currency: 'USD',
      rooms: i,
      area: 40 + i * 10,
      location: { city: 'Toshkent', address: `Ko'cha ${i}` },
      propertyType: 'apartment',
      dealType: 'sale',
      status: 'active',
      images: [],
    })
  }

  logger.info('Mock data seeded successfully')
}

async function createIndexes(): Promise<void> {
  try {
    const db = mongoose.connection.db
    if (!db) return

    await db.collection('users').createIndex({ phone: 1 }, { unique: true })
    await db.collection('users').createIndex({ role: 1 })

    await db.collection('properties').createIndex({ sellerId: 1 })
    await db.collection('properties').createIndex({ type: 1 })
    await db.collection('properties').createIndex({ dealType: 1 })
    await db.collection('properties').createIndex({ status: 1 })
    await db.collection('properties').createIndex({ price: 1 })
    await db.collection('properties').createIndex({ createdAt: -1 })
    await db.collection('properties').createIndex({ title: 'text', description: 'text' })

    await db.collection('sellers').createIndex({ userId: 1 }, { unique: true })

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

export async function closeDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
    logger.info('MongoDB disconnected')
  }
}
