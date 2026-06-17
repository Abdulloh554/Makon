import { planModel } from './plan.model'
import { subscriptionModel } from './subscription.model'
import { paymentModel } from './payment.model'
import { propertyModel } from '../property/property.model'
import { NotFoundError, ConflictError } from '../../utils/errors'

const PLANS = [
  { name: 'Premium Listing', description: '1 hafta birinchi sahifada', price: 5, currency: 'USD' as const, durationDays: 7, features: ['Birinchi sahifa', 'Featured badge', 'Statistika'] },
  { name: 'Featured Badge', description: '3 kun featured badge', price: 2, currency: 'USD' as const, durationDays: 3, features: ['Featured badge'] },
  { name: 'Agent Pro', description: '1 oy unlimited listing + verified badge', price: 20, currency: 'USD' as const, durationDays: 30, features: ['Unlimited e\'lon', 'Verified badge', 'Priority support', 'Analytics'] },
]

export async function seedPlans(): Promise<void> {
  for (const plan of PLANS) {
    const existing = await planModel.findOne({ name: plan.name })
    if (!existing) {
      await planModel.create({ ...plan, isActive: true })
    }
  }
}

export async function getPlans() {
  return planModel.find({ isActive: true })
}

export async function createPayment(data: {
  userId: string
  planId: string
  method: 'payme' | 'click' | 'stripe'
}) {
  const plan = await planModel.findById(data.planId)
  if (!plan) throw new NotFoundError('Plan not found')

  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const payment = await paymentModel.create({
    userId: data.userId,
    amount: plan.price,
    currency: plan.currency,
    method: data.method,
    transactionId,
    planId: data.planId,
    description: plan.name,
    status: 'pending',
  })

  return { payment, transactionId, amount: plan.price, currency: plan.currency }
}

export async function confirmPayment(transactionId: string) {
  const payment = await paymentModel.findOne({ transactionId })
  if (!payment) throw new NotFoundError('Payment not found')
  if (payment.status === 'completed') throw new ConflictError('Payment already completed')

  payment.status = 'completed'

  const plan = await planModel.findById(payment.planId)
  if (!plan) throw new NotFoundError('Plan not found')

  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + plan.durationDays)

  await subscriptionModel.create({
    userId: payment.userId,
    planId: payment.planId,
    startDate,
    endDate,
    status: 'active',
    paymentMethod: payment.method,
    transactionId,
  })

  await payment.save()
  return { success: true, endDate }
}

export async function boostProperty(propertyId: string, userId: string) {
  const property = await propertyModel.findById(propertyId)
  if (!property) throw new NotFoundError('Property not found')

  const activeSub = await subscriptionModel.findOne({
    userId,
    status: 'active',
    endDate: { $gt: new Date() },
  })
  if (!activeSub) throw new NotFoundError('Aktiv subscription topilmadi')

  const plan = await planModel.findById(activeSub.planId)

  await propertyModel.findByIdAndUpdate(propertyId, {
    $set: {
      promoted: true,
      promotedUntil: activeSub.endDate,
    },
  })

  return { message: `Property promoted until ${activeSub.endDate.toISOString()}`, plan: plan?.name }
}

export async function expireSubscriptions(): Promise<number> {
  const expired = await subscriptionModel.updateMany(
    { status: 'active', endDate: { $lt: new Date() } },
    { $set: { status: 'expired' } },
  )

  // Un-promote expired listings
  await propertyModel.updateMany(
    { promotedUntil: { $lt: new Date() } },
    { $set: { promoted: false, promotedUntil: null } },
  )

  return expired.modifiedCount
}
