jest.mock('../database/model', () => {
  const mm = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    aggregate: jest.fn(),
  })
  return { createModel: jest.fn(() => mm()) }
})

jest.mock('../utils/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    wrap: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  },
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
  genSalt: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>

import { userModel } from '../modules/user/user.model'
import { sellerModel } from '../modules/seller/seller.model'
import { propertyModel } from '../modules/property/property.model'
import { messageModel } from '../modules/message/message.model'
import { reviewModel } from '../modules/review/review.model'
import { cache } from '../utils/cache'
import bcrypt from 'bcryptjs'
import * as adminService from '../modules/admin/admin.service'
import { NotFoundError } from '../errors/AppError'

function mockDoc(overrides: AnyDoc = {}): AnyDoc {
  const doc: AnyDoc = {
    _id: 'id_' + Math.random().toString(36).slice(2, 8),
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
    toArray: jest.fn().mockResolvedValue(docs.map(d => {
      if (!d.toJSON) {
        const doc = { ...d }
        doc.toJSON = jest.fn(() => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { toJSON: _, ...rest } = doc
          return { ...rest, id: rest._id }
        })
        return doc
      }
      return d
    })),
  }
  cursor.then = jest.fn((resolve: (v: AnyDoc[]) => void) => {
    resolve(docs)
    return cursor
  })
  return cursor
}

function userDoc(overrides: AnyDoc = {}): AnyDoc {
  return mockDoc({
    firstName: 'Test',
    lastName: 'User',
    phone: '+998901234567',
    password: 'hashed',
    role: 'user',
    ...overrides,
  })
}

describe('AdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('login', () => {
    it('should return user with valid admin credentials', async () => {
      const admin = userDoc({ role: 'admin', password: 'hashed_admin' })
      ;(userModel.findOne as jest.Mock).mockResolvedValue(admin)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const result = await adminService.login('admin', 'password123')

      expect(userModel.findOne).toHaveBeenCalledWith({ phone: 'admin' })
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_admin')
      expect(result).toBeDefined()
      expect(result.password).toBeUndefined()
    })

    it('should throw NotFoundError when admin not found', async () => {
      ;(userModel.findOne as jest.Mock).mockResolvedValue(null)

      await expect(adminService.login('unknown', 'pass')).rejects.toThrow(NotFoundError)
    })

    it('should throw NotFoundError on wrong password', async () => {
      const admin = userDoc({ role: 'admin' })
      ;(userModel.findOne as jest.Mock).mockResolvedValue(admin)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(adminService.login('admin', 'wrong')).rejects.toThrow(NotFoundError)
    })

    it('should throw NotFoundError for non-admin role', async () => {
      const regular = userDoc({ role: 'user' })
      ;(userModel.findOne as jest.Mock).mockResolvedValue(regular)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      await expect(adminService.login('user', 'pass')).rejects.toThrow('Admin huquqi yo\'q')
    })
  })

  describe('getStats', () => {
    it('should return all counts', async () => {
      ;(userModel.countDocuments as jest.Mock).mockResolvedValue(10)
      ;(sellerModel.countDocuments as jest.Mock).mockResolvedValue(5)
      ;(propertyModel.countDocuments as jest.Mock).mockResolvedValue(20)
      ;(messageModel.countDocuments as jest.Mock).mockResolvedValue(100)
      ;(reviewModel.countDocuments as jest.Mock).mockResolvedValue(15)
      ;(propertyModel.find as jest.Mock).mockReturnValue(
        mockCursor([{ status: 'active', isActive: true, views: 10 }, { status: 'sold', isActive: true, views: 5 }])
      )

      const stats = await adminService.getStats()

      expect(stats.users).toBe(10)
      expect(stats.sellers).toBe(5)
      expect(stats.properties).toBe(20)
      expect(stats.messages).toBe(100)
      expect(stats.reviews).toBe(15)
      expect(stats.activeListings).toBe(1)
      expect(stats.totalViews).toBe(15)
    })
  })

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      const users = [userDoc({ _id: 'u1' }), userDoc({ _id: 'u2' })]
      ;(userModel.find as jest.Mock).mockReturnValue(mockCursor(users))
      ;(userModel.countDocuments as jest.Mock).mockResolvedValue(2)

      const result = await adminService.listUsers(1, 10)

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
      expect(result.data[0].password).toBeUndefined()
    })

    it('should handle empty user list', async () => {
      ;(userModel.find as jest.Mock).mockReturnValue(mockCursor([]))
      ;(userModel.countDocuments as jest.Mock).mockResolvedValue(0)

      const result = await adminService.listUsers(1, 10)

      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getUser', () => {
    it('should return user by id', async () => {
      const user = userDoc({ _id: 'u1' })
      ;(userModel.findById as jest.Mock).mockResolvedValue(user)

      const result = await adminService.getUser('u1')

      expect(userModel.findById).toHaveBeenCalledWith('u1')
      expect(result.password).toBeUndefined()
    })

    it('should throw NotFoundError for bad id', async () => {
      ;(userModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(adminService.getUser('invalid')).rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteUser', () => {
    it('should remove user and associated data', async () => {
      const user = userDoc({ _id: 'u1' })
      const seller = mockDoc({ _id: 's1', userId: 'u1' })
      ;(userModel.findById as jest.Mock).mockResolvedValue(user)
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(seller)
      ;(userModel.findByIdAndDelete as jest.Mock).mockResolvedValue({})
      ;(propertyModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 })
      ;(sellerModel.findByIdAndDelete as jest.Mock).mockResolvedValue({})
      ;(messageModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 5 })

      const result = await adminService.deleteUser('u1')

      expect(userModel.findById).toHaveBeenCalledWith('u1')
      expect(propertyModel.deleteMany).toHaveBeenCalledWith({ sellerId: 's1' })
      expect(sellerModel.findByIdAndDelete).toHaveBeenCalledWith('s1')
      expect(messageModel.deleteMany).toHaveBeenCalledWith({
        $or: [{ fromUserId: 'u1' }, { toUserId: 'u1' }],
      })
      expect(cache.delPattern).toHaveBeenCalledWith('properties:*')
      expect(result.message).toContain('o\'chirildi')
    })

    it('should throw NotFoundError for bad user id', async () => {
      ;(userModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(adminService.deleteUser('invalid')).rejects.toThrow(NotFoundError)
    })

    it('should handle user without seller record', async () => {
      const user = userDoc({ _id: 'u1' })
      ;(userModel.findById as jest.Mock).mockResolvedValue(user)
      ;(sellerModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(userModel.findByIdAndDelete as jest.Mock).mockResolvedValue({})
      ;(messageModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 })

      const result = await adminService.deleteUser('u1')

      expect(propertyModel.deleteMany).not.toHaveBeenCalledWith({ sellerId: expect.any(String) })
      expect(result).toBeDefined()
    })
  })

  describe('listProperties', () => {
    it('should return paginated properties without filters', async () => {
      const props = [mockDoc({ title: 'Prop 1' }), mockDoc({ title: 'Prop 2' })]
      ;(propertyModel.countDocuments as jest.Mock).mockResolvedValue(2)
      ;(propertyModel.find as jest.Mock).mockReturnValue(mockCursor(props))

      const result = await adminService.listProperties(1, 10)

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should apply search filter', async () => {
      ;(propertyModel.countDocuments as jest.Mock).mockResolvedValue(1)
      const findMock = jest.fn().mockReturnValue(mockCursor([mockDoc({ title: 'Luxury' })]))
      ;(propertyModel.find as jest.Mock).mockImplementation(findMock)

      await adminService.listProperties(1, 10, { search: 'luxury' })

      expect(findMock).toHaveBeenCalled()
      const filterArg = findMock.mock.calls[0][0]
      expect(filterArg.$or).toBeDefined()
    })

    it('should apply dealType filter', async () => {
      ;(propertyModel.countDocuments as jest.Mock).mockResolvedValue(0)
      ;(propertyModel.find as jest.Mock).mockReturnValue(mockCursor([]))

      await adminService.listProperties(1, 10, { dealType: 'sale' })

      const callArgs = (propertyModel.find as jest.Mock).mock.calls[0]
      if (callArgs && callArgs[0]) expect(callArgs[0].dealType).toBe('sale')
    })

    it('should apply type and status filters', async () => {
      ;(propertyModel.countDocuments as jest.Mock).mockResolvedValue(0)
      ;(propertyModel.find as jest.Mock).mockReturnValue(mockCursor([]))

      await adminService.listProperties(1, 10, { type: 'apartment', status: 'ready' })

      const args = (propertyModel.find as jest.Mock).mock.calls[0]
      if (args && args[0]) {
        expect(args[0].type).toBe('apartment')
        expect(args[0].status).toBe('ready')
      }
    })
  })

  describe('deleteProperty', () => {
    it('should remove property and clear cache', async () => {
      const prop = mockDoc({ _id: 'p1', title: 'Test' })
      ;(propertyModel.findById as jest.Mock).mockResolvedValue(prop)
      ;(propertyModel.findByIdAndDelete as jest.Mock).mockResolvedValue({})

      const result = await adminService.deleteProperty('p1')

      expect(propertyModel.findById).toHaveBeenCalledWith('p1')
      expect(propertyModel.findByIdAndDelete).toHaveBeenCalledWith('p1')
      expect(cache.delPattern).toHaveBeenCalledWith('properties:*')
      expect(result.message).toContain('o\'chirildi')
    })

    it('should throw NotFoundError for missing property', async () => {
      ;(propertyModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(adminService.deleteProperty('invalid')).rejects.toThrow(NotFoundError)
    })
  })

  describe('listSellers', () => {
    it('should return paginated sellers', async () => {
      const sellers = [mockDoc({ name: 'Seller 1' }), mockDoc({ name: 'Seller 2' })]
      ;(sellerModel.find as jest.Mock).mockReturnValue(mockCursor(sellers))
      ;(sellerModel.countDocuments as jest.Mock).mockResolvedValue(2)

      const result = await adminService.listSellers(1, 10)

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
    })
  })

  describe('deleteSeller', () => {
    it('should remove seller and their properties', async () => {
      const seller = mockDoc({ _id: 's1', name: 'Seller' })
      ;(sellerModel.findById as jest.Mock).mockResolvedValue(seller)
      ;(propertyModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 5 })
      ;(sellerModel.findByIdAndDelete as jest.Mock).mockResolvedValue({})

      const result = await adminService.deleteSeller('s1')

      expect(sellerModel.findById).toHaveBeenCalledWith('s1')
      expect(propertyModel.deleteMany).toHaveBeenCalledWith({ sellerId: 's1' })
      expect(sellerModel.findByIdAndDelete).toHaveBeenCalledWith('s1')
      expect(cache.delPattern).toHaveBeenCalledWith('properties:*')
      expect(result.message).toContain('o\'chirildi')
    })

    it('should throw NotFoundError for missing seller', async () => {
      ;(sellerModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(adminService.deleteSeller('invalid')).rejects.toThrow(NotFoundError)
    })
  })

  describe('listMessages', () => {
    it('should return paginated messages', async () => {
      const msgs = [mockDoc({ text: 'Hello' })]
      ;(messageModel.find as jest.Mock).mockReturnValue(mockCursor(msgs))
      ;(messageModel.countDocuments as jest.Mock).mockResolvedValue(1)

      const result = await adminService.listMessages(1, 10)

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('listReviews', () => {
    it('should return paginated reviews', async () => {
      const reviews = [mockDoc({ text: 'Great!' })]
      ;(reviewModel.find as jest.Mock).mockReturnValue(mockCursor(reviews))
      ;(reviewModel.countDocuments as jest.Mock).mockResolvedValue(1)

      const result = await adminService.listReviews(1, 10)

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })
})
