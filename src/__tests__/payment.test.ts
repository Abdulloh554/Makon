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
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
  })
  return { createModel: jest.fn(() => mm()) }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>

import { planModel } from '../modules/payment/plan.model'
import { subscriptionModel } from '../modules/payment/subscription.model'
import { paymentModel } from '../modules/payment/payment.model'
import { propertyModel } from '../modules/property/property.model'
import * as paymentService from '../modules/payment/payment.service'
import { NotFoundError, ConflictError } from '../errors/AppError'

function mockDoc(overrides: AnyDoc = {}): AnyDoc {
  const doc: AnyDoc = {
    _id: 'mock_' + Math.random().toString(36).slice(2, 8),
    ...overrides,
    save: jest.fn().mockResolvedValue(undefined),
  }
  doc.toJSON = jest.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toJSON: _, save: _s, ...rest } = doc
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

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('seedPlans', () => {
    it('should create plans that do not exist', async () => {
      ;(planModel.findOne as jest.Mock).mockResolvedValue(null)
      ;(planModel.create as jest.Mock).mockResolvedValue(mockDoc())

      await paymentService.seedPlans()

      expect(planModel.findOne).toHaveBeenCalled()
      expect(planModel.create).toHaveBeenCalled()
    })

    it('should skip plans that already exist', async () => {
      ;(planModel.findOne as jest.Mock).mockResolvedValue(mockDoc({ name: 'Premium Listing' }))

      await paymentService.seedPlans()

      expect(planModel.create).not.toHaveBeenCalled()
    })
  })

  describe('getPlans', () => {
    it('should return active plans', async () => {
      const plans = [mockDoc({ name: 'Premium' }), mockDoc({ name: 'Basic' })]
      ;(planModel.find as jest.Mock).mockReturnValue(mockCursor(plans))

      const result = await paymentService.getPlans()

      expect(planModel.find).toHaveBeenCalledWith({ isActive: true })
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no active plans', async () => {
      ;(planModel.find as jest.Mock).mockReturnValue(mockCursor([]))

      const result = await paymentService.getPlans()

      expect(result).toEqual([])
    })
  })

  describe('createPayment', () => {
    const data = { userId: 'user1', planId: 'plan1', method: 'payme' as const }

    it('should create a pending payment', async () => {
      const planDoc = mockDoc({ name: 'Premium Listing', price: 5, currency: 'USD' })
      ;(planModel.findById as jest.Mock).mockResolvedValue(planDoc)
      ;(paymentModel.create as jest.Mock).mockResolvedValue(mockDoc({ status: 'pending' }))

      const result = await paymentService.createPayment(data)

      expect(planModel.findById).toHaveBeenCalledWith('plan1')
      expect(paymentModel.create).toHaveBeenCalled()
      expect(result.payment).toBeDefined()
      expect(result.transactionId).toContain('txn_')
      expect(result.amount).toBe(5)
      expect(result.currency).toBe('USD')
    })

    it('should throw NotFoundError for bad planId', async () => {
      ;(planModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(paymentService.createPayment(data)).rejects.toThrow(NotFoundError)
      expect(paymentModel.create).not.toHaveBeenCalled()
    })
  })

  describe('confirmPayment', () => {
    it('should complete payment and create subscription', async () => {
      const paymentDoc = mockDoc({
        userId: 'user1',
        planId: 'plan1',
        method: 'payme',
        status: 'pending',
        transactionId: 'txn_123',
        amount: 5,
        currency: 'USD',
      })
      const planDoc = mockDoc({ durationDays: 7, name: 'Premium' })
      ;(paymentModel.findOne as jest.Mock).mockResolvedValue(paymentDoc)
      ;(planModel.findById as jest.Mock).mockResolvedValue(planDoc)
      ;(subscriptionModel.create as jest.Mock).mockResolvedValue(mockDoc())

      const result = await paymentService.confirmPayment('txn_123')

      expect(paymentModel.findOne).toHaveBeenCalledWith({ transactionId: 'txn_123' })
      expect(paymentDoc.status).toBe('completed')
      expect(paymentDoc.save).toHaveBeenCalled()
      expect(subscriptionModel.create).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.endDate).toBeDefined()
    })

    it('should throw NotFoundError if payment not found', async () => {
      ;(paymentModel.findOne as jest.Mock).mockResolvedValue(null)

      await expect(paymentService.confirmPayment('invalid')).rejects.toThrow(NotFoundError)
    })

    it('should throw ConflictError for already completed payment', async () => {
      const paymentDoc = mockDoc({
        transactionId: 'txn_123',
        status: 'completed',
        userId: 'user1',
        planId: 'plan1',
        method: 'payme',
      })
      ;(paymentModel.findOne as jest.Mock).mockResolvedValue(paymentDoc)

      await expect(paymentService.confirmPayment('txn_123')).rejects.toThrow(ConflictError)
    })

    it('should throw NotFoundError if plan referenced by payment is missing', async () => {
      const paymentDoc = mockDoc({
        transactionId: 'txn_123',
        status: 'pending',
        planId: 'nonexistent',
        userId: 'user1',
        method: 'payme',
      })
      ;(paymentModel.findOne as jest.Mock).mockResolvedValue(paymentDoc)
      ;(planModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(paymentService.confirmPayment('txn_123')).rejects.toThrow(NotFoundError)
    })
  })

  describe('boostProperty', () => {
    it('should promote a property with active subscription', async () => {
      const endDate = new Date(Date.now() + 86400000)
      const propertyDoc = mockDoc({ _id: 'prop1', sellerId: 'seller1' })
      const subDoc = mockDoc({ userId: 'user1', planId: 'plan1', endDate, status: 'active' })
      const planDoc = mockDoc({ name: 'Premium Listing' })

      ;(propertyModel.findById as jest.Mock).mockResolvedValue(propertyDoc)
      ;(subscriptionModel.findOne as jest.Mock).mockResolvedValue(subDoc)
      ;(planModel.findById as jest.Mock).mockResolvedValue(planDoc)
      ;(propertyModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({})

      const result = await paymentService.boostProperty('prop1', 'user1')

      expect(propertyModel.findById).toHaveBeenCalledWith('prop1')
      expect(subscriptionModel.findOne).toHaveBeenCalledWith({
        userId: 'user1',
        status: 'active',
        endDate: { $gt: expect.any(Date) },
      })
      expect(propertyModel.findByIdAndUpdate).toHaveBeenCalledWith('prop1', {
        $set: { promoted: true, promotedUntil: endDate },
      })
      expect(result.plan).toBe('Premium Listing')
    })

    it('should throw NotFoundError if property not found', async () => {
      ;(propertyModel.findById as jest.Mock).mockResolvedValue(null)

      await expect(paymentService.boostProperty('invalid', 'user1')).rejects.toThrow(NotFoundError)
    })

    it('should throw if no active subscription', async () => {
      ;(propertyModel.findById as jest.Mock).mockResolvedValue(mockDoc({ _id: 'prop1' }))
      ;(subscriptionModel.findOne as jest.Mock).mockResolvedValue(null)

      await expect(paymentService.boostProperty('prop1', 'user1')).rejects.toThrow('Aktiv subscription topilmadi')
    })
  })

  describe('expireSubscriptions', () => {
    it('should expire old subscriptions and un-promote listings', async () => {
      ;(subscriptionModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 })
      ;(propertyModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 })

      const result = await paymentService.expireSubscriptions()

      expect(subscriptionModel.updateMany).toHaveBeenCalledWith(
        { status: 'active', endDate: { $lt: expect.any(Date) } },
        { $set: { status: 'expired' } },
      )
      expect(propertyModel.updateMany).toHaveBeenCalledWith(
        { promotedUntil: { $lt: expect.any(Date) } },
        { $set: { promoted: false, promotedUntil: null } },
      )
      expect(result).toBe(3)
    })

    it('should return 0 when no subscriptions expired', async () => {
      ;(subscriptionModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 })
      ;(propertyModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 })

      const result = await paymentService.expireSubscriptions()

      expect(result).toBe(0)
    })
  })
})
