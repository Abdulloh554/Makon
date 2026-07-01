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

async function ensureSeedData(): Promise<void> {
  if (process.env.USE_MONGO === 'false') {
    const { propertyModel } = await import('./modules/property/property.model')
    const count = await propertyModel.countDocuments()
    if (count > 0) {
      console.log(`Mock DB: ${count} ta e'lon mavjud, seed talab qilinmaydi`)
      return
    }
    console.log('Mock DB: ma\'lumotlar topilmadi, seed qilinmoqda...')
    const bcrypt = await import('bcryptjs')
    const { userModel } = await import('./modules/user/user.model')
    const { sellerModel } = await import('./modules/seller/seller.model')

    await userModel.create({
      firstName: 'Admin', lastName: 'Admin', phone: 'qwerty',
      email: 'admin@makon.uz', password: await bcrypt.hash('qwerty', 10),
      role: 'admin', isActive: true, isVerified: true,
    })

    const sellerUsers = [
      { firstName: 'Akmal', lastName: 'Toshmatov', phone: '+998901234501' },
      { firstName: 'Nilufar', lastName: 'Azimova', phone: '+998901234502' },
    ]
    const sellerDocs = []
    for (const su of sellerUsers) {
      const user = await userModel.create({ ...su, password: '$2a$10$dummy' })
      const seller = await sellerModel.create({
        userId: String((user as any)._id || (user as any).id),
        name: `${su.firstName} ${su.lastName}`, phone: su.phone, rating: 5.0, totalListings: 0,
      })
      sellerDocs.push(seller)
    }

    const props = [
      { title: 'Yangi kvartira, Yunusobod', dealType: 'sale', type: 'apartment', status: 'ready', price: 85000, rooms: 3, area: 75 },
      { title: 'Kundalik ijaraga hashamatli uy', dealType: 'daily', type: 'house', status: 'ready', price: 150, rooms: 5, area: 200 },
      { title: 'Uzoq muddatli ijara, Chilonzor', dealType: 'rent', type: 'apartment', status: 'ready', price: 400, rooms: 2, area: 55 },
      { title: 'Nasiyaga kvartira, Mirzo Ulug\'bek', dealType: 'installment', type: 'apartment', status: 'half-ready', price: 65000, rooms: 3, area: 65 },
      { title: 'Kottej sotiladi, Qibray', dealType: 'sale', type: 'cottage', status: 'ready', price: 120000, rooms: 6, area: 250 },
      { title: 'Dacha ijaraga, Chimyon', dealType: 'rent', type: 'dacha', status: 'ready', price: 300, rooms: 4, area: 120 },
      { title: 'Tijorat binosi, Shahrisabz', dealType: 'sale', type: 'commercial', status: 'half-ready', price: 200000, rooms: 0, area: 500 },
      { title: 'Yer maydoni sotiladi, Toshkent vil', dealType: 'sale', type: 'land', status: 'land', price: 30000, rooms: 0, area: 1000 },
      { title: 'Kundalik kvartira, Shahar markazi', dealType: 'daily', type: 'apartment', status: 'ready', price: 80, rooms: 1, area: 35 },
      { title: 'Nasiyaga hovli, Sergeli', dealType: 'installment', type: 'house', status: 'half-ready', price: 55000, rooms: 4, area: 150 },
    ]
    for (let i = 0; i < props.length; i++) {
      const p = props[i]
      await propertyModel.create({
        sellerId: String((sellerDocs[i % sellerDocs.length] as any)._id || (sellerDocs[i % sellerDocs.length] as any).id),
        title: p.title, description: `${p.title} — demo e'lon.`, price: p.price,
        type: p.type, dealType: p.dealType, status: p.status,
        rooms: p.rooms, area: p.area, featured: i < 8,
        location: { lat: 41.2995 + (i * 0.01), lng: 69.2401 + (i * 0.01), address: 'Toshkent shahri' },
        images: [], isActive: true,
      })
    }
    console.log(`✅ Mock DB: ${props.length} ta demo e'lon yaratildi (admin: qwerty / qwerty)`)
  }
}

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

  // Auto-seed mock DB if empty
  try {
    await ensureSeedData()
  } catch (err) {
    console.error('Seed error:', err instanceof Error ? err.message : 'Unknown error')
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
