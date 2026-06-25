/**
 * @file validate.middleware.ts
 * @layer Middleware
 * @responsibility Zod schema validation for request body, query, and params
 */

import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'
import { ValidationError } from '../errors/AppError'

interface ValidationSchemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body)
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query)
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params)
      }

      next()
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        next(err)
        return
      }

      if (err && typeof err === 'object' && 'issues' in err) {
        const zodError = err as { issues: Array<{ path: (string | number)[]; message: string }> }
        const details = zodError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
        next(new ValidationError('Validation failed', details))
        return
      }

      next(err)
    }
  }
}
