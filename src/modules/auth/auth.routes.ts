import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/auth'
import { authRateLimit } from '../../middleware/rateLimit'
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validator'
import * as ctrl from './auth.controller'

const router = Router()

router.post('/login', authRateLimit, validate(loginSchema), ctrl.login)
router.post('/register', authRateLimit, validate(registerSchema), ctrl.register)
router.post('/refresh', authRateLimit, ctrl.refresh)
router.post('/forgot-password', validate(forgotPasswordSchema), ctrl.forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), ctrl.resetPassword)
router.get('/me', authenticate, ctrl.me)
router.post('/logout', ctrl.logout)
router.delete('/account', authenticate, ctrl.deleteAccount)

export default router
