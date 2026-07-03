import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import * as fs from 'fs'
import * as path from 'path'

// Set custom DNS servers for SRV resolution (required for mongodb+srv:// to work)
const dns = require('dns')
dns.setServers(['8.8.8.8', '1.1.1.1'])

const COLLECTION_MAP: Record<string, string> = {
  User: 'users',
  Seller: 'sellers',
  Property: 'properties',
  Message: 'messages',
  Review: 'reviews',
}

const REFERENCE_FIELDS: Record<string, string[]> = {
  User: [],
  Seller: ['userId'],
  Property: ['sellerId', 'favorites'],
  Message: ['fromUserId', 'toUserId', 'propertyId'],
  Review: ['sellerId', 'userId'],
}

async function migrate() {
  const mockDbPath = path.resolve(__dirname, '../../data/mock-db.json')

  if (!fs.existsSync(mockDbPath)) {
    console.error('mock-db.json topilmadi:', mockDbPath)
    process.exit(1)
  }

  const rawData = fs.readFileSync(mockDbPath, 'utf-8')
  const data = JSON.parse(rawData)

  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI env variable is not set')
    process.exit(1)
  }

  mongoose.set('strictQuery', true)

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    })
    console.log('MongoDB ga ulanish muvaffaqiyatli')
    console.log('Database name:', mongoose.connection.db?.databaseName || 'N/A')
  } catch (err) {
    console.error('MongoDB ga ulanishda xatolik:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  // Build ID mapping: old string ID → new ObjectId string
  const idMap = new Map<string, string>()

  // First pass: assign new ObjectId to every document
  for (const modelName of Object.keys(COLLECTION_MAP)) {
    const docs = data[modelName]
    if (!docs) continue
    for (const oldId of Object.keys(docs)) {
      idMap.set(oldId, new mongoose.Types.ObjectId().toString())
    }
  }

  // Second pass: update _id and references, insert into MongoDB
  for (const [modelName, collectionName] of Object.entries(COLLECTION_MAP)) {
    const docsMap = data[modelName]
    if (!docsMap || Object.keys(docsMap).length === 0) {
      console.log(`${modelName}: 0 ta hujjat, o'tkazib yuborildi`)
      continue
    }

    const entries: Record<string, unknown>[] = []

    for (const [oldId, doc] of Object.entries(docsMap)) {
      const d = { ...doc as Record<string, unknown> }

      // Remove mock-specific fields
      delete (d as any).$inc
      delete (d as any)._sellerId

      // Replace _id with new ObjectId
      d._id = idMap.get(oldId)

      // Update reference fields to new ObjectId strings
      const refFields = REFERENCE_FIELDS[modelName] || []
      for (const field of refFields) {
        if (field === 'favorites' && Array.isArray(d[field])) {
          d[field] = (d[field] as string[]).map((id: string) => idMap.get(id) || id)
        } else if (typeof d[field] === 'string' && idMap.has(d[field] as string)) {
          d[field] = idMap.get(d[field] as string)
        }
      }

      entries.push(d)
    }

    const collection = mongoose.connection.collection(collectionName)
    const existingCount = await collection.countDocuments()
    if (existingCount > 0) {
      await collection.deleteMany({})
      console.log(`${modelName}: ${existingCount} ta eski hujjat o'chirildi`)
    }

    const existingBefore = await collection.countDocuments()
    console.log(`${modelName}: before=${existingBefore}`)

    if (existingBefore > 0) {
      await collection.deleteMany({})
      console.log(`${modelName}: eskilari o'chirildi`)
    }

    const result = await collection.insertMany(entries as any)
    const afterCount = await collection.countDocuments()
    console.log(`${modelName}: ${result.insertedCount} ta yozildi, after=${afterCount}`)
  }

  // Final verification
  console.log('\n--- Verification ---')
  for (const [modelName, collectionName] of Object.entries(COLLECTION_MAP)) {
    const collection = mongoose.connection.collection(collectionName)
    const count = await collection.countDocuments()
    console.log(`${collectionName}: ${count} documents`)
  }
  console.log('--- End Verification ---')

  console.log('\n✅ Barcha ma\'lumotlar mock-db.json dan MongoDB ga muvaffaqiyatli ko\'chirildi!')
  console.log('📝 Eslatma: Eski mock ID lar yangi ObjectId lar bilan almashtirildi')

  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('Migratsiya xatosi:', err)
  process.exit(1)
})
