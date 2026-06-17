import { ERROR_CODES } from '../constants'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean
  public readonly details?: Array<{ field: string; message: string }>

  constructor(message: string, statusCode: number, code?: string, details?: Array<{ field: string; message: string }>) {
    super(message)
    this.statusCode = statusCode
    this.code = code || ERROR_CODES.INTERNAL_ERROR
    this.isOperational = true
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Array<{ field: string; message: string }>) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, details)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, ERROR_CODES.NOT_FOUND)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Token talab qilinadi. Avval tizimga kiring.') {
    super(message, 401, ERROR_CODES.UNAUTHORIZED)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Sizga ruxsat berilmagan.') {
    super(message, 403, ERROR_CODES.FORBIDDEN)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, ERROR_CODES.CONFLICT)
  }
}
