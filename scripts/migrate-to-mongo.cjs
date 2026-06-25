const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')

const MOCK_FILE = path.resolve(__dirname, '../data/mock-db.json')
const URI = 'mongodb+srv://gofurjonovabdulloh551_db_user:QnRCiazQ2Rtq8dPn@cluster0.hi1m6u2.mongodb.net/makon'

const COLLECTION_MAP = {
  Plan: 'plans',
  User: 'users',
  Seller: 'sellers',
  Property: 'properties',
  Message: 'messages',
  Review: 'reviews',
}

async function migrate() {
  await mongoose.connect(URI)
  console.log('Connected to MongoDB')

  const raw = JSON.parse(fs.readFileSync(MOCK_FILE, 'utf-8'))
  const db = mongoose.connection.db

  for (const [oldName, newName] of Object.entries(COLLECTION_MAP)) {
    const docs = Object.values(raw[oldName] || {})
    if (docs.length === 0) {
      console.log(`${oldName} → ${newName}: 0 documents, skipped`)
      continue
    }
    const col = db.collection(newName)
    await col.deleteMany({})
    await col.insertMany(docs)
    console.log(`${oldName} → ${newName}: ${docs.length} documents migrated`)
  }

  await mongoose.disconnect()
  console.log('Done!')
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
