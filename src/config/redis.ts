import { config } from './index'
import { logger } from '../lib/logger'

let client: import('ioredis').Redis | null = null

export async function connectRedis(): Promise<void> {
  if (!config.redis.enabled || config.isTest) {
    logger.info('Redis disabled. Caching will use in-memory fallback.')
    return
  }
  try {
    const { Redis } = await import('ioredis')
    client = new Redis(config.redis.url)
    client.on('error', (err: Error) => {
      logger.warn('Redis connection error', { error: err.message })
    })
    await client.ping()
    logger.info('Redis connected')
  } catch (err) {
    logger.warn('Redis unavailable, using in-memory cache fallback.', {
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    client = null
  }
}

export function getRedisClient(): import('ioredis').Redis | null {
  return client
}
