/**
 * @file auth.routes.ts
 * @layer Routes
 * @responsibility Auth route definitions — login, register, refresh, logout, me, forgot/reset password
 */

import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware'
import { authenticate } from '../../middleware/auth.middleware'
import { rateLimiter } from '../../middleware/rate-limit.middleware'

import { authController } from './auth.controller'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema'

const router = Router()

const authRateLimit = rateLimiter('auth')

router.post(
  '/login',
  authRateLimit,
  validate({ body: loginSchema }),
  authController.login,
)

router.post(
  '/register',
  authRateLimit,
  validate({ body: registerSchema }),
  authController.register,
)

router.post(
  '/refresh',
  authRateLimit,
  authController.refresh,
)

router.post(
  '/google',
  authController.google,
)

router.post(
  '/logout',
  authController.logout,
)

router.get(
  '/me',
  authenticate,
  authController.me,
)

router.post(
  '/forgot-password',
  authRateLimit,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
)

router.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
)

export default router
