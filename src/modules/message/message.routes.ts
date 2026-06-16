import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { messageCreateSchema } from '../../lib/validation'
import * as ctrl from './message.controller'

const router = Router()

router.get('/conversations', authenticate, ctrl.listConversations)
router.get('/unread', authenticate, ctrl.getUnreadCount)
router.get('/:conversationId', authenticate, ctrl.getMessages)
router.post('/', authenticate, validate(messageCreateSchema), ctrl.send)

export default router
