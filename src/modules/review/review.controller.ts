import type { Request, Response, NextFunction } from 'express'
import * as reviewService from './review.service'
import { sendSuccess } from '../../lib/response'

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reviews = await reviewService.list()
    sendSuccess(res, reviews)
  } catch (err) {
    next(err)
  }
}

export async function getBySeller(req: Request<{ sellerId: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const reviews = await reviewService.getBySeller(req.params.sellerId)
    sendSuccess(res, reviews)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sellerId, userId, userName, rating, text } = req.body
    const review = await reviewService.create({ sellerId, userId, userName, rating, text })
    sendSuccess(res, review, 201)
  } catch (err) {
    next(err)
  }
}
