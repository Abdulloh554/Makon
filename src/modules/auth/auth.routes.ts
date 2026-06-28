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
  sendOtpSchema,
  verifyRegistrationSchema,
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
  '/firebase',
  authController.firebase,
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
  '/send-otp',
  authRateLimit,
  validate({ body: sendOtpSchema }),
  authController.sendOtp,
)

router.post(
  '/verify-registration',
  authRateLimit,
  validate({ body: verifyRegistrationSchema }),
  authController.verifyRegistration,
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
