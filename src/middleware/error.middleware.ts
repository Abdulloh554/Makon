/**
 * @file error.middleware.ts
 * @layer Middleware
 * @responsibility Global error handler — maps AppError to API response, logs unknown errors
 */

import type { Request, Response, NextFunction } from 'express'
import { config } from '../config'
import { AppError } from '../errors/AppError'

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    const body: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    }

    if (err.details) {
      body.error.details = err.details
    }

    res.status(err.statusCode).json(body)
    return
  }

  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    requestId: req.requestId,
  })

  const body: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProduction ? 'An unexpected error occurred' : err.message,
    },
  }

  res.status(500).json(body)
}
