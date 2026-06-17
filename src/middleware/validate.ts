import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'
import { sendError } from '../utils/response'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      if (parsed.body) req.body = parsed.body
      if (parsed.query) req.query = parsed.query
      next()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err) {
        const zodErr = err as { errors: Array<{ path: (string | number)[]; message: string }> }
        const details = zodErr.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
        sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details)
        return
      }
      next(err)
    }
  }
}
