import { Router } from 'express'
import * as ctrl from './seller.controller'

const router = Router()

router.get('/', ctrl.list)
router.get('/:id', ctrl.getById)
router.get('/:id/properties', ctrl.getProperties)

export default router
