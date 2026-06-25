/**
 * @file redis.ts
 * @layer Database
 * @responsibility Redis client singleton with health check — throws in production if unavailable
 */

import { Redis } from 'ioredis'
import { config } from '../config'

let client: Redis | null = null

export async function connectRedis(): Promise<Redis> {
  if (client) {
    return client
  }

  const instance = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        return null
      }
      return Math.min(times * 200, 2000)
    },
    lazyConnect: true,
  })

  instance.on('error', (err: Error) => {
    console.error('Redis error:', err.message)
  })

  instance.on('ready', () => {
    console.log('Redis connected successfully')
  })

  try {
    await instance.connect()
    await instance.ping()
    client = instance
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (config.isProduction) {
      throw new Error(`Redis connection failed: ${message}`)
    }

    console.warn(`Redis unavailable (${message}) — running without cache`)
    client = instance
  }

  return client
}

export function getRedisClient(): Redis | null {
  return client
}

export function parseRedisUrl(url: string): { host: string; port: number; password?: string; db?: number } {
  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1) || '0', 10) : undefined,
    }
  } catch {
    return { host: 'localhost', port: 6379 }
  }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit()
    client = null
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  if (!client) {
    return false
  }
  try {
    const result = await client.ping()
    return result === 'PONG'
  } catch {
    return false
  }
}
