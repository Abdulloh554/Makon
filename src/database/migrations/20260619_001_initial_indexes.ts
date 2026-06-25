/**
 * @file 20260619_001_initial_indexes.ts
 * @layer Database
 * @responsibility Initial migration — creates indexes for the Makon platform
 * NOTE: Mongoose schema `unique: true` / `index: true` handles per-field indexes.
 * This migration only creates compound and special indexes that schemas cannot define.
 */

import type { Db } from 'mongodb'

export async function up(db: Db): Promise<void> {
  // Users — compound indexes only (unique fields are in schema)
  await db.collection('users').createIndex({ createdAt: -1 })
  await db.collection('users').createIndex({ phone: 1 }, { unique: true, sparse: true })
  await db.collection('users').createIndex({ resetPasswordToken: 1 }, { sparse: true })

  // Properties
  await db.collection('properties').createIndex({ sellerId: 1, status: 1 })
  await db.collection('properties').createIndex({ dealType: 1, status: 1, createdAt: -1 })
  await db.collection('properties').createIndex({ 'location.lat': 1, 'location.lng': 1 })
  await db.collection('properties').createIndex({ title: 'text', description: 'text' })
  await db.collection('properties').createIndex({ createdAt: -1 })
  await db.collection('properties').createIndex({ type: 1, dealType: 1 })
  await db.collection('properties').createIndex({ price: 1 })
  await db.collection('properties').createIndex({ isActive: 1, expiresAt: 1 })
  await db.collection('properties').createIndex({ isActive: 1, dealType: 1, status: 1, createdAt: -1 })
  await db.collection('properties').createIndex({ sellerId: 1, isActive: 1 })

  // Messages
  await db.collection('messages').createIndex({ conversationId: 1, createdAt: 1 })
  await db.collection('messages').createIndex({ fromUserId: 1, createdAt: -1 })
  await db.collection('messages').createIndex({ toUserId: 1, read: 1 })
  await db.collection('messages').createIndex({ fromUserId: 1, toUserId: 1, createdAt: 1 })
  await db.collection('messages').createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 31536000 },
  )

  // Sellers
  await db.collection('sellers').createIndex({ userId: 1 }, { unique: true })
  await db.collection('sellers').createIndex({ isVerified: 1, createdAt: -1 })
  await db.collection('sellers').createIndex({ rating: -1 })

  // Reviews
  await db.collection('reviews').createIndex({ sellerId: 1, createdAt: -1 })
  await db.collection('reviews').createIndex(
    { userId: 1, sellerId: 1 },
    { unique: true },
  )
  await db.collection('reviews').createIndex({ sellerId: 1, rating: 1 })

  // Payments
  await db.collection('payments').createIndex({ userId: 1, createdAt: -1 })
  await db.collection('payments').createIndex({ status: 1, createdAt: -1 })
  await db.collection('payments').createIndex({ transactionId: 1 }, { sparse: true })
  await db.collection('payments').createIndex({ userId: 1, status: 1 })
}

export async function down(db: Db): Promise<void> {
  await db.collection('users').dropIndexes()
  await db.collection('properties').dropIndexes()
  await db.collection('messages').dropIndexes()
  await db.collection('sellers').dropIndexes()
  await db.collection('reviews').dropIndexes()
  await db.collection('payments').dropIndexes()
}
