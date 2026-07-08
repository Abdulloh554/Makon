/**
 * @file auth.repository.ts
 * @layer Repository
 * @responsibility Auth-specific database operations — password hashing, token blacklisting
 */

import bcrypt from 'bcryptjs'
import { userRepository } from '../user/user.repository'
import { getRedisClient } from '../../database/redis'

const SALT_ROUNDS = 12

export const authRepository = {
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS)
    return bcrypt.hash(password, salt)
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  },

  async findUserByPhone(phone: string) {
    return userRepository.findByPhone(phone)
  },

  async findUserByPhoneWithPassword(phone: string) {
    return userRepository.findByPhoneWithPassword(phone)
  },

  async findUserByEmail(email: string) {
    return userRepository.findByEmail(email)
  },

  async findUserByEmailWithPassword(email: string) {
    return userRepository.findByEmailWithPassword(email)
  },

  async findUserById(id: string) {
    return userRepository.findById(id)
  },

  async createUser(data: {
    username: string
    phone: string
    password: string
  }) {
    return userRepository.create({
      firstName: data.username,
      lastName: '',
      username: data.username,
      phone: data.phone,
      password: data.password,
      name: data.username,
      role: 'user',
      provider: 'local',
      email: '',
    })
  },

  async setResetToken(id: string, token: string, expiresAt: Date) {
    return userRepository.setResetToken(id, token, expiresAt)
  },

  async blacklistRefreshToken(tokenId: string, expiresAt: Date): Promise<void> {
    const redis = getRedisClient()
    if (!redis) {
      return
    }

    const ttlSeconds = Math.ceil((expiresAt.getTime() - Date.now()) / 1000)
    if (ttlSeconds > 0) {
      await redis.set(
        `token:blacklist:${tokenId}`,
        'true',
        'EX',
        ttlSeconds,
      )
    }
  },

  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    const redis = getRedisClient()
    if (!redis) {
      return false
    }

    const result = await redis.get(`token:blacklist:${tokenId}`)
    return result === 'true'
  },

  async findByResetToken(token: string) {
    return userRepository.findByResetToken(token)
  },

  async updatePassword(id: string, hashedPassword: string) {
    return userRepository.updatePassword(id, hashedPassword)
  },
}
