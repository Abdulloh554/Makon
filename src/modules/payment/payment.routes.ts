import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import * as ctrl from './payment.controller'

const router = Router()

router.get('/plans', ctrl.listPlans)
router.post('/create', authenticate, ctrl.createPayment)
router.post('/webhook/payme', ctrl.handlePaymeWebhook)
router.post('/webhook/click', ctrl.handleClickWebhook)
router.post('/webhook/stripe', ctrl.handleStripeWebhook)
router.post('/boost/:propertyId', authenticate, ctrl.boostProperty)

export default router
