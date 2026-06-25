/**
 * @file connection.ts
 * @layer Database
 * @responsibility MongoDB connection with retry logic
 */

import mongoose from 'mongoose'
import { config } from '../config'

let isConnected = false

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    return
  }

  const uri = config.isTest && config.mongodb.testUri
    ? config.mongodb.testUri
    : config.mongodb.uri

  mongoose.set('strictQuery', true)

  mongoose.connection.on('connected', () => {
    isConnected = true
    console.log('MongoDB connected successfully')
  })

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message)
  })

  mongoose.connection.on('disconnected', () => {
    isConnected = false
    console.warn('MongoDB disconnected')
  })

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsInsecure: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Failed to connect to MongoDB:', message)

    if (config.isProduction) {
      throw new Error(`MongoDB connection failed: ${message}`)
    }

    console.warn('Running without MongoDB — some features will be unavailable')
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return
  }

  await mongoose.disconnect()
  isConnected = false
  console.log('MongoDB disconnected')
}

export function getDatabaseStatus(): boolean {
  return isConnected
}
