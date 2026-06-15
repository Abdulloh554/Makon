import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { z } from 'zod'
import * as ctrl from './message.controller'

const messageSendSchema = z.object({
  body: z.object({
    toUserId: z.string().min(1, 'Qabul qiluvchi ID majburiy'),
    text: z.string().min(1, 'Xabar matni majburiy').max(1000).trim(),
    propertyId: z.string().optional().default('general'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
})

const messageListQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    userId: z.string().min(1, 'userId parametri majburiy'),
  }),
  params: z.object({}).optional(),
})

const router = Router()

router.get('/unread', authenticate, ctrl.unreadCount)
router.get('/', authenticate, validate(messageListQuerySchema), ctrl.list)
router.post('/', authenticate, validate(messageSendSchema), ctrl.send)
router.patch('/:id/read', authenticate, ctrl.markRead)

export default router
