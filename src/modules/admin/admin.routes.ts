import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { roleGuard } from '../../middleware/role.guard'
import { doubleCsrfProtection } from '../../middleware/csrf.middleware'
import * as ctrl from './admin.controller'

const router = Router()

router.post('/login', ctrl.login)
router.get('/stats', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.stats)
router.get('/users', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.listUsers)
router.get('/users/:id', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.getUser)
router.delete('/users/:id', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.deleteUser)
router.get('/properties', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.listProperties)
router.delete('/properties/:id', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.deleteProperty)
router.post('/migrate-images', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.migrateImages)
router.get('/sellers', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.listSellers)
router.delete('/sellers/:id', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.deleteSeller)
router.get('/messages', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.listMessages)
router.get('/reviews', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.listReviews)
router.patch('/properties/:id/feature', authenticate, doubleCsrfProtection, roleGuard('admin'), ctrl.toggleFeatured)

export default router
