import type { Response } from 'express'

interface PaginationMeta {
  total: number
  page: number
  totalPages: number
  limit: number
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: PaginationMeta): void {
  const response: Record<string, unknown> = {
    success: true,
    data,
  }
  if (meta) {
    response.meta = meta
  }
  res.status(statusCode).json(response)
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Array<{ field: string; message: string }>,
): void {
  const response: Record<string, unknown> = {
    success: false,
    error: { code, message, details },
  }
  res.status(statusCode).json(response)
}
