import { createModel } from '../../lib/model'

export interface Subscription {
  id: string
  userId: string
  planId: string
  startDate: Date
  endDate: Date
  status: 'active' | 'expired' | 'cancelled'
  autoRenew: boolean
  paymentMethod: 'payme' | 'click' | 'stripe' | 'free'
  transactionId: string
}

export const subscriptionSchemaDef = {
  userId: { type: String, required: true, index: true },
  planId: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  autoRenew: { type: Boolean, default: false },
  paymentMethod: { type: String, enum: ['payme', 'click', 'stripe', 'free'], required: true },
  transactionId: { type: String },
}

export const subscriptionModel = createModel('Subscription', subscriptionSchemaDef)
