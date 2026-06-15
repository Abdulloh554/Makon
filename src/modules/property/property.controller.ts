import type { Request, Response, NextFunction } from 'express'
import * as propertyService from './property.service'
import { sendSuccess } from '../../lib/response'

type Req = Request<{ id: string }>

function getUserId(req: Request): string {
  return (req as unknown as { userId: string }).userId
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await propertyService.list(req.query as Record<string, unknown>)
    sendSuccess(res, result.data, 200, {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      limit: Number(req.query.limit) || 20,
    })
  } catch (err) {
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
    const property = await propertyService.create(req.body, getUserId(req))
    sendSuccess(res, property, 201)
  } catch (err) {
    next(err)
  }
}

export async function update(req: Req, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertyService.update(req.params.id, req.body, getUserId(req))
    sendSuccess(res, property)
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
