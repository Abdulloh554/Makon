import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import { config } from './config'

async function clearDatabase() {
  const uri = config.mongodb.uri
  console.log('Connecting to MongoDB...')
  await mongoose.connect(uri)
  console.log('Connected.')

  const db = mongoose.connection.db
  if (!db) {
    console.error('No database connection.')
    await mongoose.disconnect()
    return
  }

  const collections = await db.listCollections().toArray()
  console.log(`Found ${collections.length} collections.`)

  for (const col of collections) {
    await db.dropCollection(col.name)
    console.log(`  Dropped: ${col.name}`)
  }

  console.log('All collections dropped.')
  await mongoose.disconnect()
  console.log('Done.')
}

clearDatabase().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
