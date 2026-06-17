import type { Request, Response, NextFunction } from 'express'
import * as sellerService from './seller.service'
import { sendSuccess } from '../../utils/response'

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellers = await sellerService.list()
    sendSuccess(res, sellers)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const seller = await sellerService.getById(req.params.id)
    sendSuccess(res, seller)
  } catch (err) {
    next(err)
  }
}

export async function getProperties(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const properties = await sellerService.getProperties(req.params.id)
    sendSuccess(res, properties)
  } catch (err) {
    next(err)
  }
}
