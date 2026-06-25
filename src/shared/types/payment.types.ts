/**
 * @file payment.types.ts
 * @layer Shared
 * @responsibility Payment and transaction types
 */

export const PAYMENT_PROVIDERS = ['stripe', 'payme', 'click'] as const
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

export const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export interface Payment {
  id: string
  userId: string
  propertyId?: string
  amount: number
  currency: string
  provider: PaymentProvider
  status: PaymentStatus
  providerTransactionId?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentRequest {
  propertyId: string
  amount: number
  currency?: string
  provider: PaymentProvider
}

export interface PaymentHistoryResponse {
  payments: Payment[]
  total: number
}
