import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import * as ctrl from './image.controller'

const router = Router()

router.post('/upload', authenticate, ctrl.upload)
router.get('/:hash', ctrl.getInfo)
router.delete('/:hash', authenticate, ctrl.remove)

export default router
