import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import * as authService from './auth.service'
import { sendSuccess, sendError } from '../../utils/response'
import { config } from '../../config'
import { loginSchema, registerSchema } from '../../validations/index'
import { ZodError } from 'zod'
import { generateToken, generateRefreshToken } from '../../middleware/auth'

function getUserId(req: Request): string {
  return (req as unknown as { userId: string }).userId
}

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000 // 15 daqiqa
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 kun

function setAuthCookies(res: Response, token: string, refreshToken: string): void {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/',
  })
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/',
  })
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('token', { path: '/' })
  res.clearCookie('refresh_token', { path: '/' })
}

function handleZodError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    sendError(res, 400, 'VALIDATION_ERROR', messages.join('; '))
    return true
  }
  return false
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, password } = loginSchema.parse(req.body)
    const result = await authService.login(phone, password)
    const token = generateToken(result.user)
    const refreshToken = generateRefreshToken(result.user)
    setAuthCookies(res, token, refreshToken)
    sendSuccess(res, { token, user: result.user })
  } catch (err) {
    if (handleZodError(err, res)) return
    next(err)
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { firstName, lastName, phone, password } = registerSchema.parse(req.body)
    const result = await authService.register(firstName, lastName, phone, password)
    const token = generateToken(result.user)
    const refreshToken = generateRefreshToken(result.user)
    setAuthCookies(res, token, refreshToken)
    sendSuccess(res, { token, user: result.user }, 201)
  } catch (err) {
    if (handleZodError(err, res)) return
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshTokenStr = req.cookies?.refresh_token
    if (!refreshTokenStr) {
      sendError(res, 401, 'NO_REFRESH_TOKEN', 'Refresh token topilmadi.')
      return
    }

    const decoded = jwt.verify(refreshTokenStr, config.jwt.refreshSecret) as { id: string; phone: string; type: string }
    if (decoded.type !== 'refresh') {
      sendError(res, 401, 'INVALID_TOKEN', 'Yaroqsiz refresh token.')
      return
    }

    const result = await authService.me(decoded.id)
    const newToken = generateToken(result)
    const newRefreshToken = generateRefreshToken(result)

    setAuthCookies(res, newToken, newRefreshToken)
    sendSuccess(res, { user: result })
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      clearAuthCookies(res)
      sendError(res, 401, 'REFRESH_EXPIRED', 'Sessiya muddati o\'tgan. Qayta kiring.')
      return
    }
    next(err)
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.me(getUserId(req))
    sendSuccess(res, user)
  } catch (err) {
    next(err)
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.deleteAccount(getUserId(req))
    clearAuthCookies(res)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone } = req.body
    const result = await authService.forgotPassword(phone)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body
    const result = await authService.resetPassword(token, password)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  clearAuthCookies(res)
  sendSuccess(res, { message: 'Tizimdan chiqildi.' })
}
