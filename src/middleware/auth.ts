import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { UnauthorizedError } from '../lib/errors'
import { sendError } from '../lib/response'
import { userModel } from '../modules/user/user.model'

declare global {
  namespace Express {
    interface Request {
      user?: Record<string, unknown>
      userId?: string
    }
  }
}

interface JwtPayload {
  id: string
  phone: string
  type?: 'access' | 'refresh'
}

export function generateToken(user: Record<string, unknown>): string {
  const userId = user._id ? user._id.toString() : (user.id || '')
  return jwt.sign(
    { id: userId, phone: user.phone || '', type: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions,
  )
}

export function generateRefreshToken(user: Record<string, unknown>): string {
  const userId = user._id ? user._id.toString() : (user.id || '')
  return jwt.sign(
    { id: userId, phone: user.phone || '', type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions,
  )
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1]
  }
  const token = req.cookies?.token
  if (token) return token
  return null
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req)
    if (!token) {
      throw new UnauthorizedError()
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload
    const user = await userModel.findById(decoded.id)
    if (!user) {
      throw new UnauthorizedError('Foydalanuvchi topilmadi.')
    }

    const userId = String((user as Record<string, unknown>)._id ?? (user as Record<string, unknown>).id ?? '')

    req.user = user as Record<string, unknown>
    req.userId = userId
    next()
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      sendError(res, err.statusCode, err.code, err.message)
      return
    }
    if (err instanceof jwt.TokenExpiredError) {
      sendError(res, 401, 'TOKEN_EXPIRED', 'Token muddati o\'tgan. Yangilash uchun /auth/refresh ga so\'rov yuboring.')
      return
    }
    sendError(res, 401, 'INVALID_TOKEN', 'Yaroqsiz token.')
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req)
    if (!token) {
      next()
      return
    }
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload
    const user = await userModel.findById(decoded.id)
    if (user) {
      req.user = user as Record<string, unknown>
      req.userId = String((user as Record<string, unknown>)._id ?? (user as Record<string, unknown>).id ?? '')
    }
  } catch {
    // Token invalid or expired — continue without auth
  }
  next()
}
