import type { Request, Response, NextFunction } from 'express'
import { config } from '../config'
import { logger } from '../utils/logger'
import { AppError } from '../utils/errors'
import { sendError } from '../utils/response'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn(err.message, {
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
    })
    sendError(res, err.statusCode, err.code, err.message, err.details)
    return
  }

  logger.error(err.message, { stack: err.stack })

  const statusCode = (err as Error & { status?: number }).status || 500
  sendError(
    res,
    statusCode,
    'INTERNAL_ERROR',
    config.isDev ? err.message : 'Something went wrong',
  )
}
