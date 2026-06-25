/**
 * @file rate-limit.middleware.ts
 * @layer Middleware
 * @responsibility Redis-backed rate limiter with 3 tiers + in-memory fallback
 */

import type { Request, Response, NextFunction } from 'express'
import { getRedisClient } from '../database/redis'
import { RateLimitError } from '../errors/AppError'

interface RateLimitConfig {
  windowMs: number
  max: number
  keyPrefix: string
  blockDurationMs?: number
  maxConsecutiveFailures?: number
}

const TIERS: Record<string, RateLimitConfig> = {
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyPrefix: 'ratelimit:auth:',
    blockDurationMs: 60 * 60 * 1000,
    maxConsecutiveFailures: 5,
  },
  api: {
    windowMs: 15 * 60 * 1000,
    max: 200,
    keyPrefix: 'ratelimit:api:',
  },
  upload: {
    windowMs: 60 * 60 * 1000,
    max: 20,
    keyPrefix: 'ratelimit:upload:',
  },
}

// ─── In-memory fallback rate limiter ──────────────────────────────
const memoryStore = new Map<string, { timestamps: number[] }>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryStore) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60000)
    if (entry.timestamps.length === 0) {
      memoryStore.delete(key)
    }
  }
}, 60000).unref()

function memoryRateLimit(key: string, windowMs: number, max: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowStart = now - windowMs

  let entry = memoryStore.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    memoryStore.set(key, entry)
  }

  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)
  if (entry.timestamps.length >= max) {
    return { allowed: false, remaining: 0 }
  }

  entry.timestamps.push(now)
  return { allowed: true, remaining: max - entry.timestamps.length }
}

function getKey(req: Request, tier: string): string {
  const userId = req.userId
  if (userId && tier !== 'auth') {
    return `${TIERS[tier].keyPrefix}user:${userId}`
  }
  return `${TIERS[tier].keyPrefix}ip:${req.ip}`
}

export function rateLimiter(tier: string = 'api') {
  const config = TIERS[tier]

  if (!config) {
    throw new Error(`Unknown rate limit tier: ${tier}`)
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const redis = getRedisClient()

    if (!redis || redis.status !== 'ready') {
      const key = getKey(req, tier)
      const { allowed, remaining } = memoryRateLimit(key, config.windowMs, config.max)
      res.set('X-RateLimit-Limit', String(config.max))
      res.set('X-RateLimit-Remaining', String(remaining))
      if (!allowed) {
        next(new RateLimitError())
        return
      }
      next()
      return
    }

    const key = getKey(req, tier)
    const now = Date.now()

    try {
      const multi = redis.multi()
      multi.zadd(key, now, `${now}:${Math.random()}`)
      multi.zremrangebyscore(key, 0, now - config.windowMs)
      multi.zcard(key)
      multi.expire(key, Math.ceil(config.windowMs / 1000))

      const results = await multi.exec()

      if (!results) {
        next(new RateLimitError())
        return
      }

      const cardResult = results[2] as [Error | null, number]
      const count = cardResult[1]

      if (config.maxConsecutiveFailures) {
        const blockKey = `${key}:block`
        const blocked = await redis.get(blockKey)

        if (blocked) {
          const ttl = await redis.ttl(blockKey)
          res.set('Retry-After', String(ttl))
          next(new RateLimitError(`Too many failed attempts. Try again in ${ttl} seconds.`))
          return
        }
      }

      if (count > config.max) {
        res.set('X-RateLimit-Limit', String(config.max))
        res.set('X-RateLimit-Remaining', '0')
        res.set('X-RateLimit-Reset', String(Math.ceil((now + config.windowMs) / 1000)))
        next(new RateLimitError())
        return
      }

      res.set('X-RateLimit-Limit', String(config.max))
      res.set('X-RateLimit-Remaining', String(config.max - count))
      res.set('X-RateLimit-Reset', String(Math.ceil((now + config.windowMs) / 1000)))

      next()
    } catch (err) {
      next(err)
    }
  }
}

export async function trackFailedAttempt(key: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) {
    return
  }

  const config = TIERS.auth
  const blockKey = `ratelimit:auth:ip:${key}:block`

  const count = await redis.incr(blockKey)
  if (count === 1) {
    await redis.expire(blockKey, config.windowMs / 1000)
  }

  if (config.maxConsecutiveFailures && count >= config.maxConsecutiveFailures) {
    await redis.expire(blockKey, (config.blockDurationMs || 3600000) / 1000)
  }
}
