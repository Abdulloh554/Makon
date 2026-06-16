import mongoose from 'mongoose'
import { config } from '../config'

beforeAll(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/makon_test'
  await mongoose.connect(uri)
})

afterAll(async () => {
  await mongoose.disconnect()
})

afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})
