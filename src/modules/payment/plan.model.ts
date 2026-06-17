import { createModel } from '../../database/model'

export interface Plan {
  id: string
  name: string
  description: string
  price: number
  currency: 'USD' | 'UZS'
  durationDays: number
  features: string[]
  isActive: boolean
}

export const planSchemaDef = {
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'UZS'], default: 'USD' },
  durationDays: { type: Number, required: true },
  features: [{ type: String }],
  isActive: { type: Boolean, default: true },
}

export const planModel = createModel('Plan', planSchemaDef)
