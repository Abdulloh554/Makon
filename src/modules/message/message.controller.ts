import type { Request, Response, NextFunction } from 'express'
import * as messageService from './message.service'
import { sendSuccess, sendError } from '../../utils/response'
import { messageCreateSchema } from '../../validations/index'
import { emitNewMessage } from '../../services/socket'
import { ZodError } from 'zod'

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

export async function send(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = messageCreateSchema.parse(req.body)
    const message = await messageService.create(data, getUserId(req))
    emitNewMessage(message as Record<string, unknown>)
    sendSuccess(res, message, 201)
  } catch (err) {
    if (handleZodError(err, res)) return
    next(err)
  }
}

export async function listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const conversations = await messageService.getConversations(getUserId(req))
    sendSuccess(res, conversations)
  } catch (err) {
    next(err)
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : ''
    if (userId) {
      const messages = await messageService.getMessages(userId, getUserId(req))
      sendSuccess(res, messages)
      return
    }

    const conversations = await messageService.getConversations(getUserId(req))
    sendSuccess(res, conversations)
  } catch (err) {
    next(err)
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const conversationId = req.params.conversationId as string
    const messages = await messageService.getMessages(conversationId, getUserId(req))
    sendSuccess(res, messages)
  } catch (err) {
    next(err)
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await messageService.getUnreadCount(getUserId(req))
    sendSuccess(res, { unread: count })
  } catch (err) {
    next(err)
  }
}
