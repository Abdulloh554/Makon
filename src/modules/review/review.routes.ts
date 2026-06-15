import { Router } from 'express'
import * as ctrl from './review.controller'

const router = Router()

router.get('/', ctrl.list)
router.get('/seller/:sellerId', ctrl.getBySeller)
router.post('/', ctrl.create)

export default router
