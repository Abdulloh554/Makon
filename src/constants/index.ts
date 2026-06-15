export const PROPERTY_TYPES = ['apartment', 'house', 'cottage', 'dacha', 'commercial', 'land'] as const
export const DEAL_TYPES = ['daily', 'sale', 'rent', 'installment'] as const
export const PROPERTY_STATUSES = ['ready', 'half-ready', 'land', 'sold'] as const
export const USER_ROLES = ['user', 'seller', 'admin'] as const

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
} as const
