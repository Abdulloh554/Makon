import mongoose from 'mongoose'
import { store } from '../database/store'

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  store.useMock = true
})

afterAll(async () => {
  await mongoose.disconnect().catch(() => {})
})

afterEach(async () => {
  const { clearAllMockData } = require('../database/mockdb')
  await clearAllMockData()
})
