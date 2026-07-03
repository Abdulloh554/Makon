import type { Request, Response, NextFunction } from 'express'
import * as propertyService from './property.service'
import { sendSuccess, sendError } from '../../utils/response'
import { propertyQuerySchema, propertyCreateSchema, propertyUpdateSchema } from '../../validations/index'
import { ZodError } from 'zod'

type Req = Request<{ id: string }>

function getUserId(req: Request): string {
  return (req as unknown as { userId: string }).userId
}

function handleZodError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    sendError(res, 400, 'VALIDATION_ERROR', messages.join('; '))
    return true
  }
  return false
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = propertyQuerySchema.parse(req.query)
    const result = await propertyService.list(filters as Record<string, unknown>)
    sendSuccess(res, result.data, 200, {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      limit: Number(filters.limit) || 20,
    })
  } catch (err) {
    if (handleZodError(err, res)) return
    next(err)
  }
}

export async function getById(req: Req, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertyService.getById(req.params.id)
    sendSuccess(res, property)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = propertyCreateSchema.parse(req.body)
    const property = await propertyService.create(data, getUserId(req))
    sendSuccess(res, property, 201)
  } catch (err) {
    if (handleZodError(err, res)) return
    next(err)
  }
}

export async function update(req: Req, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = propertyUpdateSchema.parse(req.body)
    const property = await propertyService.update(req.params.id, data, getUserId(req))
    sendSuccess(res, property)
  } catch (err) {
    if (handleZodError(err, res)) return
    next(err)
  }
}

export async function getFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const properties = await propertyService.getFavorites(getUserId(req))
    sendSuccess(res, properties)
  } catch (err) {
    next(err)
  }
}

export async function toggleFavorite(req: Req, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await propertyService.toggleFavorite(req.params.id, getUserId(req))
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function deleteProperty(req: Req, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await propertyService.deleteProperty(req.params.id, getUserId(req))
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}
