/**
 * @file api.types.ts
 * @layer Shared
 * @responsibility Standard API response envelope types for all endpoints
 */

export interface PaginationMeta {
  total: number
  page: number
  totalPages: number
  limit: number
}

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ApiErrorDetail {
  field: string
  message: string
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: ApiErrorDetail[] | unknown
}

export interface ApiError {
  success: false
  error: ApiErrorBody
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNPROCESSABLE: 'UNPROCESSABLE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
