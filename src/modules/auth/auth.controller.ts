/**
 * @file auth.controller.ts
 * @layer Controller
 * @responsibility Parse HTTP request, call auth service, set cookies, return response
 */

import type { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'
import { generateCsrfToken } from '../../middleware/csrf.middleware'
import { config } from '../../config'

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: ACCESS_COOKIE_MAX_AGE,
    path: '/',
  })

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/api/v1/auth/refresh',
  })
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' })
  res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' })
  res.clearCookie('csrf-token', { path: '/' })
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, password } = req.body as { phone: string; password: string }
      const result = await authService.login(phone, password)

      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken)

      const csrfToken = generateCsrfToken(req, res)

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          csrfToken,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, phone, password } = req.body as {
        username: string
        phone: string
        password: string
      }

      const result = await authService.register(username, phone, password)

      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken)

      const csrfToken = generateCsrfToken(req, res)

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          csrfToken,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Refresh token not found.' },
        })
        return
      }

      const result = await authService.refresh(refreshToken)

      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken)

      const csrfToken = generateCsrfToken(req, res)

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          csrfToken,
        },
      })
    } catch (err) {
      if (err instanceof Error && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token.' },
        })
        return
      }
      next(err)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token

      if (refreshToken) {
        await authService.logout(refreshToken)
      }

      clearAuthCookies(res)

      res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully.' },
      })
    } catch (err) {
      next(err)
    }
  },

  async google(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken } = req.body as { idToken: string }
      if (!idToken) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'idToken is required.' },
        })
        return
      }
      const result = await authService.google(idToken)
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken)
      const csrfToken = generateCsrfToken(req, res)
      res.status(200).json({
        success: true,
        data: { user: result.user, csrfToken },
      })
    } catch (err) {
      next(err)
    }
  },

  async firebase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken } = req.body as { idToken: string }
      if (!idToken) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'idToken is required.' },
        })
        return
      }
      const result = await authService.firebase(idToken)
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken)
      const csrfToken = generateCsrfToken(req, res)
      res.status(200).json({
        success: true,
        data: { user: result.user, csrfToken },
      })
    } catch (err) {
      next(err)
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!

      const user = await authService.me(userId)

      res.status(200).json({
        success: true,
        data: user,
      })
    } catch (err) {
      next(err)
    }
  },

  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, username } = req.body as {
        phone: string
        username: string
      }

      const result = await authService.sendRegistrationOtp(phone, username)

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  },

  async verifyRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp } = req.body as { phone: string; otp: string }

      const result = await authService.verifyRegistrationOtp(phone, otp)

      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken)

      const csrfToken = generateCsrfToken(req, res)

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          csrfToken,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body as { phone: string }
      const result = await authService.forgotPassword(phone)

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body as { token: string; password: string }
      const result = await authService.resetPassword(token, password)

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (err) {
      next(err)
    }
  },

  async getCsrfToken(req: Request, res: Response): Promise<void> {
    const csrfToken = generateCsrfToken(req, res)
    res.json({ success: true, data: { csrfToken } })
  },
}
