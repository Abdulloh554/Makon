import type { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service'
import { sendSuccess } from '../../lib/response'
import { config } from '../../config'

function getUserId(req: Request): string {
  return (req as unknown as { userId: string }).userId
}

function setTokenCookie(res: Response, token: string): void {
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge,
    path: '/',
  })
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, password } = req.body
    const result = await authService.login(phone, password)
    setTokenCookie(res, result.token)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { firstName, lastName, phone, password } = req.body
    const result = await authService.register(firstName, lastName, phone, password)
    setTokenCookie(res, result.token)
    sendSuccess(res, result, 201)
  } catch (err) {
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
  res.clearCookie('token', { path: '/' })
  sendSuccess(res, { message: 'Tizimdan chiqildi.' })
}
