import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import * as ctrl from './message.controller'

const router = Router()

router.get('/', authenticate, ctrl.list)
router.get('/conversations', authenticate, ctrl.listConversations)
router.get('/unread', authenticate, ctrl.getUnreadCount)
router.get('/:conversationId', authenticate, ctrl.getMessages)
router.post('/', authenticate, ctrl.send)
router.put('/:messageId', authenticate, ctrl.update)
router.delete('/:messageId', authenticate, ctrl.remove)

export default router
