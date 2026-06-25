import { getRedisClient } from '../database/redis'
import { logger } from './logger'

const memoryCache = new Map<string, { data: unknown; expires: number }>()
const DEFAULT_TTL = 300

class Cache {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient()
    if (client) {
      try {
        const val = await client.get(key)
        return val ? (JSON.parse(val) as T) : null
      } catch (err) {
        logger.warn('Redis get error', { key, error: err instanceof Error ? err.message : 'Unknown' })
      }
    }
    const mem = memoryCache.get(key)
    if (!mem) return null
    if (mem.expires && Date.now() > mem.expires) {
      memoryCache.delete(key)
      return null
    }
    return mem.data as T
  }

  async set<T>(key: string, data: T, ttl = DEFAULT_TTL): Promise<void> {
    const client = getRedisClient()
    if (client) {
      try {
        await client.setex(key, ttl, JSON.stringify(data))
        return
      } catch (err) {
        logger.warn('Redis set error', { key, error: err instanceof Error ? err.message : 'Unknown' })
      }
    }
    memoryCache.set(key, { data, expires: Date.now() + ttl * 1000 })
  }

  async del(key: string): Promise<void> {
    const client = getRedisClient()
    if (client) {
      try {
        await client.del(key)
        return
      } catch (err) {
        logger.warn('Redis del error', { key, error: err instanceof Error ? err.message : 'Unknown' })
      }
    }
    memoryCache.delete(key)
  }

  async delPattern(pattern: string): Promise<void> {
    const client = getRedisClient()
    if (client) {
      try {
        // SCAN yordamida pattern bo'yicha kalitlarni xavfsiz o'chirish (KEYS bloklamaydi)
        let cursor = '0'
        do {
          const result = await (client as any).scan(cursor, 'MATCH', pattern, 'COUNT', '100')
          cursor = result[0] as string
          const keys = result[1] as string[]
          if (keys.length > 0) await client.del(...keys)
        } while (cursor !== '0')
        return
      } catch (err) {
        logger.warn('Redis delPattern error', { pattern, error: err instanceof Error ? err.message : 'Unknown' })
      }
    }
    const prefix = pattern.replace('*', '')
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) memoryCache.delete(key)
    }
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached
    const data = await fn()
    await this.set(key, data, ttl)
    return data
  }
}

export const cache = new Cache()
