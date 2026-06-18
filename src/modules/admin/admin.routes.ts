import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/auth'
import { sendError } from '../../utils/response'
import * as ctrl from './admin.controller'

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req.user?.role as string) || ''
  if (role !== 'admin') {
    sendError(res, 403, 'FORBIDDEN', 'Admin huquqi talab qilinadi')
    return
  }
  next()
}

const router = Router()

router.post('/login', ctrl.login)
router.get('/stats', authenticate, requireAdmin, ctrl.stats)
router.get('/users', authenticate, requireAdmin, ctrl.listUsers)
router.get('/users/:id', authenticate, requireAdmin, ctrl.getUser)
router.delete('/users/:id', authenticate, requireAdmin, ctrl.deleteUser)
router.get('/properties', authenticate, requireAdmin, ctrl.listProperties)
router.delete('/properties/:id', authenticate, requireAdmin, ctrl.deleteProperty)
router.post('/migrate-images', authenticate, requireAdmin, ctrl.migrateImages)
router.get('/sellers', authenticate, requireAdmin, ctrl.listSellers)
router.delete('/sellers/:id', authenticate, requireAdmin, ctrl.deleteSeller)
router.get('/messages', authenticate, requireAdmin, ctrl.listMessages)
router.get('/reviews', authenticate, requireAdmin, ctrl.listReviews)

export default router
