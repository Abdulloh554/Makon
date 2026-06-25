function createMockModel() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
  }
}

jest.mock('../database/model', () => ({
  createModel: jest.fn(() => createMockModel()),
}))

jest.mock('../utils/cache')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>

import { reviewModel } from '../modules/review/review.model'
import { sellerModel } from '../modules/seller/seller.model'
import { cache } from '../utils/cache'
import * as reviewService from '../modules/review/review.service'
import { NotFoundError } from '../errors/AppError'

function mockDoc(overrides: AnyDoc = {}): AnyDoc {
  const doc: AnyDoc = {
    _id: 'rev_' + Math.random().toString(36).slice(2, 8),
    sellerId: 'seller1',
    userId: 'user1',
    userName: 'John',
    rating: 5,
    text: 'Great seller!',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
  doc.toJSON = jest.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toJSON: _, ...rest } = doc
    return { ...rest, id: rest._id }
  })
  return doc
}

function mockCursor(docs: AnyDoc[] = []) {
  const cursor: any = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue(docs),
  }
  cursor.then = jest.fn((resolve: (v: AnyDoc[]) => void) => {
    resolve(docs)
    return cursor
  })
  return cursor
}

describe('ReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('list', () => {
    it('should return all reviews sorted by createdAt desc', async () => {
      const docs = [mockDoc({ _id: 'r1' }), mockDoc({ _id: 'r2' })]
      ;(reviewModel.find as jest.Mock).mockReturnValue(mockCursor(docs))
      ;(cache.wrap as jest.Mock).mockImplementation((_key: string, fn: () => Promise<unknown>) => fn())

      const result = await reviewService.list()

      expect(result).toHaveLength(2)
      expect(reviewModel.find).toHaveBeenCalled()
    })

    it('should return empty array when no reviews', async () => {
      ;(reviewModel.find as jest.Mock).mockReturnValue(mockCursor([]))
      ;(cache.wrap as jest.Mock).mockImplementation((_key: string, fn: () => Promise<unknown>) => fn())

      const result = await reviewService.list()

      expect(result).toEqual([])
    })

    it('should cache the results', async () => {
      ;(reviewModel.find as jest.Mock).mockReturnValue(mockCursor([mockDoc()]))
      ;(cache.wrap as jest.Mock).mockImplementation((_key: string, fn: () => Promise<unknown>) => fn())

      await reviewService.list()

      expect(cache.wrap).toHaveBeenCalledWith('reviews:list', expect.any(Function), 60)
    })
  })

  describe('getBySeller', () => {
    it('should return reviews for a specific seller', async () => {
      const docs = [mockDoc({ _id: 'r1', sellerId: 'seller1' })]
      ;(reviewModel.find as jest.Mock).mockReturnValue(mockCursor(docs))
      ;(cache.wrap as jest.Mock).mockImplementation((_key: string, fn: () => Promise<unknown>) => fn())

      const result = await reviewService.getBySeller('seller1')

      expect(result).toHaveLength(1)
      expect(reviewModel.find).toHaveBeenCalledWith({ sellerId: 'seller1' })
    })

    it('should return empty array for seller with no reviews', async () => {
      ;(reviewModel.find as jest.Mock).mockReturnValue(mockCursor([]))
      ;(cache.wrap as jest.Mock).mockImplementation((_key: string, fn: () => Promise<unknown>) => fn())

      const result = await reviewService.getBySeller('nonexistent')

      expect(result).toEqual([])
    })

    it('should use seller-specific cache key', async () => {
      ;(reviewModel.find as jest.Mock).mockReturnValue(mockCursor([]))
      ;(cache.wrap as jest.Mock).mockImplementation((_key: string, fn: () => Promise<unknown>) => fn())

      await reviewService.getBySeller('seller1')

      expect(cache.wrap).toHaveBeenCalledWith('reviews:seller:seller1', expect.any(Function), 120)
    })
  })

  describe('create', () => {
    const createData = {
      sellerId: 'seller1',
      userId: 'user1',
      userName: 'John',
      rating: 5,
      text: 'Great seller!',
    }

    it('should create a review and update seller rating', async () => {
      const sellerDoc: AnyDoc = { _id: 'seller1', userId: 'user1', rating: 4.5 }
      sellerDoc.toJSON = jest.fn(() => ({ id: 'seller1', userId: 'user1', rating: 4.5 }))
      const createdDoc = mockDoc(createData)

      ;(sellerModel.findById as jest.Mock).mockResolvedValue(sellerDoc)
      ;(reviewModel.create as jest.Mock).mockResolvedValue(createdDoc)
      ;(reviewModel as any).aggregate = jest.fn().mockResolvedValue([{ avgRating: 4.8 }])
      ;(sellerModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({})

      const result = await reviewService.create(createData)

      expect(sellerModel.findById).toHaveBeenCalledWith('seller1')
      expect(reviewModel.create).toHaveBeenCalledWith(createData)
      expect(sellerModel.findByIdAndUpdate).toHaveBeenCalledWith('seller1', {
        $set: { rating: 4.8 },
      })
      expect(cache.del).toHaveBeenCalledWith('seller:seller1')
      expect(result).toBeDefined()
    })

    it('should throw NotFoundError if seller does not exist', async () => {
      ;(sellerModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(reviewService.create(createData)).rejects.toThrow(NotFoundError)
      expect(reviewModel.create).not.toHaveBeenCalled()
    })

    it('should handle no aggregate stats (first review)', async () => {
      const sellerDoc: AnyDoc = { _id: 'seller1', userId: 'user1', rating: 0 }
      sellerDoc.toJSON = jest.fn(() => ({ id: 'seller1', userId: 'user1', rating: 0 }))
      const createdDoc = mockDoc(createData)

      ;(sellerModel.findById as jest.Mock).mockResolvedValue(sellerDoc)
      ;(reviewModel.create as jest.Mock).mockResolvedValue(createdDoc)
      ;(reviewModel as any).aggregate = jest.fn().mockResolvedValue([])
      ;(sellerModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({})

      await reviewService.create(createData)

      expect(sellerModel.findByIdAndUpdate).toHaveBeenCalledWith('seller1', {
        $set: { rating: 5 },
      })
    })

    it('should clear cache after creation', async () => {
      const sellerDoc: AnyDoc = { _id: 'seller1', userId: 'user1', rating: 4.5 }
      sellerDoc.toJSON = jest.fn(() => ({ id: 'seller1', userId: 'user1', rating: 4.5 }))
      const createdDoc = mockDoc(createData)

      ;(sellerModel.findById as jest.Mock).mockResolvedValue(sellerDoc)
      ;(reviewModel.create as jest.Mock).mockResolvedValue(createdDoc)
      ;(reviewModel as any).aggregate = jest.fn().mockResolvedValue([{ avgRating: 4.8 }])
      ;(sellerModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({})

      await reviewService.create(createData)

      expect(cache.del).toHaveBeenCalledWith('seller:seller1')
    })
  })
})
