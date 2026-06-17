import type { Request, Response, NextFunction } from 'express'
import { config } from '../config'
import { sendError } from '../utils/response'
import { getRedisClient } from '../config/redis'
import { logger } from '../utils/logger'

interface HitEntry {
  timestamps: number[]
}

const hits = new Map<string, HitEntry>()

const cleanupInterval = setInterval(() => {
  const now = Date.now()
  const windowMs = config.rateLimit.windowMs
  for (const [key, entry] of hits.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
    if (entry.timestamps.length === 0) {
      hits.delete(key)
    }
  }
}, 5 * 60 * 1000)
cleanupInterval.unref()

const AUTH_MAX = 50
const AUTH_WINDOW_MS = 15 * 60 * 1000

export function authRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = `auth:${req.ip}`
  memoryRateLimit(key, Date.now(), AUTH_WINDOW_MS, AUTH_MAX, res, next)
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = `${req.ip}:${req.path}`
  const windowMs = config.rateLimit.windowMs
  const max = config.rateLimit.max

  const redis = getRedisClient()
  if (redis) {
    const redisKey = `ratelimit:${key}`
    const now = Date.now()
    const windowSec = Math.ceil(windowMs / 1000)

    redis.multi()
      .zadd(redisKey, now, `${now}:${Math.random()}`)
      .zremrangebyscore(redisKey, 0, now - windowMs)
      .zcard(redisKey)
      .expire(redisKey, windowSec)
      .exec((execErr, results) => {
        if (execErr || !results) {
          logger.warn('Redis rate limit error, falling back to in-memory', {
            error: execErr instanceof Error ? execErr.message : 'Unknown',
          })
          memoryRateLimit(key, now, windowMs, max, res, next)
          return
        }
        const [, cardResult] = results[2] as [Error | null, number]
        if (cardResult > max) {
          sendError(res, 429, 'RATE_LIMIT_EXCEEDED', `So'rovlar chegarasiga yetildi. ${Math.ceil(windowMs / 1000)} soniyadan keyin urinib ko'ring.`)
          return
        }
        next()
      })
    return
  }

  memoryRateLimit(key, Date.now(), windowMs, max, res, next)
}

function memoryRateLimit(key: string, now: number, windowMs: number, max: number, res: Response, next: NextFunction): void {
  if (!hits.has(key)) {
    hits.set(key, { timestamps: [] })
  }

  const entry = hits.get(key)!
  const recent = entry.timestamps.filter((t) => now - t < windowMs)
  recent.push(now)
  entry.timestamps = recent

  if (recent.length > max) {
    sendError(res, 429, 'RATE_LIMIT_EXCEEDED', `So'rovlar chegarasiga yetildi. ${Math.ceil(windowMs / 1000)} soniyadan keyin urinib ko'ring.`)
    return
  }

  next()
}
