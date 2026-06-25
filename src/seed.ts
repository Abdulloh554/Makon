import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { config } from './config'

async function seed() {
  const uri = config.mongodb.uri
  console.log('Connecting to MongoDB...')
  await mongoose.connect(uri)
  console.log('Connected.')

  const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    phone: { type: String, unique: true, sparse: true },
    password: String,
    role: { type: String, enum: ['user', 'seller', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    name: { type: String, default: '' },
  }, { timestamps: true })

  const User = mongoose.model('User', userSchema)

  const existing = await User.findOne({ role: 'admin' })
  if (existing) {
    console.log('Admin user already exists:', existing.phone)
  } else {
    const hash = await bcrypt.hash('qwerty', 10)
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Admin',
      phone: 'qwerty',
      password: hash,
      role: 'admin',
      isActive: true,
      isVerified: true,
      name: 'Admin Admin',
    })
    console.log('Admin user created:', admin.phone)
  }

  await mongoose.disconnect()
  console.log('Done.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
