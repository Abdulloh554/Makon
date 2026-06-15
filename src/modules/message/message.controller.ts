import type { Request, Response, NextFunction } from 'express'
import * as messageService from './message.service'
import { sendSuccess } from '../../lib/response'

function getUserId(req: Request): string {
  return (req as unknown as { userId: string }).userId
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string
    const messages = await messageService.list(userId, getUserId(req))
    sendSuccess(res, messages)
  } catch (err) {
    next(err)
  }
}

export async function send(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { toUserId, propertyId, text } = req.body
    const message = await messageService.send(getUserId(req), toUserId, propertyId, text)
    sendSuccess(res, message, 201)
  } catch (err) {
    next(err)
  }
}

export async function markRead(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const message = await messageService.markRead(req.params.id, getUserId(req))
    sendSuccess(res, message)
  } catch (err) {
    next(err)
  }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await messageService.unreadCount(getUserId(req))
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}
