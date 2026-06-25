jest.mock('../database/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue(null),
}))

jest.mock('../utils/logger', () => ({
  logger: { warn: jest.fn() },
}))

import {
  AppError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  RateLimitError,
  ValidationError,
  ForbiddenError,
  UnprocessableError,
} from '../errors/AppError'
import { cache } from '../utils/cache'

describe('AppError types', () => {
  describe('AppError', () => {
    it('should create base error with correct properties', () => {
      const err = new AppError('Test error', 400, 'TEST_CODE', [{ field: 'name', message: 'required' }])

      expect(err.message).toBe('Test error')
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('TEST_CODE')
      expect(err.isOperational).toBe(true)
      expect(err.details).toEqual([{ field: 'name', message: 'required' }])
      expect(err.name).toBe('AppError')
    })

    it('should create error without details', () => {
      const err = new AppError('Simple error', 500, 'SIMPLE')

      expect(err.details).toBeUndefined()
    })
  })

  describe('ValidationError', () => {
    it('should have default message and 400 status', () => {
      const err = new ValidationError()

      expect(err.message).toBe('Validation failed')
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('VALIDATION_ERROR')
    })

    it('should accept custom message and details', () => {
      const err = new ValidationError('Custom', [{ field: 'email', message: 'invalid' }])

      expect(err.message).toBe('Custom')
      expect(err.details).toEqual([{ field: 'email', message: 'invalid' }])
    })
  })

  describe('UnauthorizedError', () => {
    it('should have 401 status', () => {
      const err = new UnauthorizedError()

      expect(err.statusCode).toBe(401)
      expect(err.code).toBe('UNAUTHORIZED')
      expect(err.message).toBe('Authentication required')
    })

    it('should accept custom message', () => {
      const err = new UnauthorizedError('Custom unauthorized')

      expect(err.message).toBe('Custom unauthorized')
    })
  })

  describe('ForbiddenError', () => {
    it('should have 403 status', () => {
      const err = new ForbiddenError()

      expect(err.statusCode).toBe(403)
      expect(err.code).toBe('FORBIDDEN')
    })
  })

  describe('NotFoundError', () => {
    it('should have 404 status', () => {
      const err = new NotFoundError()

      expect(err.statusCode).toBe(404)
      expect(err.code).toBe('NOT_FOUND')
    })
  })

  describe('ConflictError', () => {
    it('should have 409 status', () => {
      const err = new ConflictError('Already exists')

      expect(err.statusCode).toBe(409)
      expect(err.code).toBe('CONFLICT')
      expect(err.message).toBe('Already exists')
    })
  })

  describe('RateLimitError', () => {
    it('should have 429 status', () => {
      const err = new RateLimitError()

      expect(err.statusCode).toBe(429)
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('UnprocessableError', () => {
    it('should have 422 status', () => {
      const err = new UnprocessableError('Cannot process')

      expect(err.statusCode).toBe(422)
      expect(err.code).toBe('UNPROCESSABLE')
    })
  })
})

describe('Cache utility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('get/set', () => {
    it('should set and get value from memory cache', async () => {
      await cache.set('test:key', { foo: 'bar' }, 60)

      const result = await cache.get('test:key')

      expect(result).toEqual({ foo: 'bar' })
    })

    it('should return null for missing key', async () => {
      const result = await cache.get('nonexistent')

      expect(result).toBeNull()
    })

    it('should expire keys', async () => {
      jest.useFakeTimers()
      await cache.set('test:expire', 'value', 1)

      jest.advanceTimersByTime(2000)

      const result = await cache.get('test:expire')
      expect(result).toBeNull()
      jest.useRealTimers()
    })
  })

  describe('del', () => {
    it('should delete a key', async () => {
      await cache.set('test:del', 'value')
      await cache.del('test:del')

      const result = await cache.get('test:del')
      expect(result).toBeNull()
    })

    it('should not throw when deleting nonexistent key', async () => {
      await expect(cache.del('nonexistent')).resolves.toBeUndefined()
    })
  })

  describe('wrap', () => {
    it('should call function and cache result', async () => {
      const fn = jest.fn().mockResolvedValue('computed')

      const result = await cache.wrap('test:wrap', fn, 60)

      expect(result).toBe('computed')
      expect(fn).toHaveBeenCalledTimes(1)

      const cached = await cache.get('test:wrap')
      expect(cached).toBe('computed')
    })

    it('should return cached value on subsequent calls', async () => {
      const fn = jest.fn().mockResolvedValue('computed')

      await cache.wrap('test:wrap2', fn, 60)
      const result2 = await cache.wrap('test:wrap2', fn, 60)

      expect(result2).toBe('computed')
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      await cache.set('test:pattern:1', 'a')
      await cache.set('test:pattern:2', 'b')
      await cache.set('other:key', 'c')

      await cache.delPattern('test:pattern:*')

      const r1 = await cache.get('test:pattern:1')
      const r2 = await cache.get('test:pattern:2')
      const r3 = await cache.get('other:key')

      expect(r1).toBeNull()
      expect(r2).toBeNull()
      expect(r3).toBe('c')
    })

    it('should not throw when pattern matches nothing', async () => {
      await expect(cache.delPattern('nothing:*')).resolves.toBeUndefined()
    })
  })
})
