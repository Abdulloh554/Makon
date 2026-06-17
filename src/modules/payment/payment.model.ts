import { createModel } from '../../database/model'

export interface Payment {
  id: string
  userId: string
  amount: number
  currency: 'USD' | 'UZS'
  method: 'payme' | 'click' | 'stripe'
  transactionId: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  planId: string
  description: string
  createdAt: string
}

export const paymentSchemaDef = {
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'UZS'], default: 'USD' },
  method: { type: String, enum: ['payme', 'click', 'stripe'], required: true },
  transactionId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  planId: { type: String, required: true },
  description: { type: String },
}

export const paymentModel = createModel('Payment', paymentSchemaDef)
