import mongoose from 'mongoose'
import { config } from './index'
import { logger } from '../lib/logger'

const MAX_RETRIES = 3
const RETRY_BASE_MS = 2000

export const store = { useMock: false }

export async function connectDB(): Promise<void> {
  if (config.isTest) return

  if (!config.mongodb.useMongo) {
    store.useMock = true
    const mockdb = await import('../lib/mockdb')
    if (!mockdb.hasPersistedData()) {
      await seedMockData()
    } else {
      logger.info('Loaded persisted mock data from disk')
      await seedMockProperties()
    }
    await mockdb.ensureAdminUser()
    return
  }

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
        logger.warn('MongoDB unavailable — falling back to mock database')
        store.useMock = true
        const mockdb = await import('../lib/mockdb')
        if (!mockdb.hasPersistedData()) {
          await seedMockData()
        } else {
          logger.info('Loaded persisted mock data from disk')
          await seedMockProperties()
        }
        await mockdb.ensureAdminUser()
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
    password: '$2a$10$if98FxiexMFN53Iycru3p.WleurJwkL37rxvAe0Z5yZ6ZlJeeWT5O',
    role: 'user',
  })
  await users.create({
    firstName: 'Admin',
    lastName: 'Admin',
    phone: 'qwerty',
    password: '$2a$10$c4vBVt65paQ/ZPAHOGv3DujvzaxaD/vwLVgfCoVZoDOhQS6tZJ0Ue',
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
  await seedProperties(properties)

  logger.info('Mock data seeded successfully')
}

async function seedMockProperties(): Promise<void> {
  const { createMockModel } = await import('../lib/mockdb')
  const properties = createMockModel('Property')
  const count = await properties.countDocuments()
  if (count > 0) return
  await seedProperties(properties)
  logger.info('Mock properties seeded')
}

async function seedProperties(model: {
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
}): Promise<void> {
  for (let i = 1; i <= 10; i++) {
    await model.create({
      title: `${i} xonali kvartira Toshkent`,
      description: `Zamonaviy ${i} xonali kvartira.`,
      price: 30000 + i * 5000,
      currency: 'USD',
      rooms: i,
      area: 40 + i * 10,
      location: { lat: 41.31 + i * 0.002, lng: 69.28 + i * 0.003, city: 'Toshkent', address: `Ko'cha ${i}` },
      propertyType: 'apartment',
      dealType: 'sale',
      status: 'active',
      isActive: true,
      images: [],
    })
  }
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
