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
}

export function generateToken(user: Record<string, unknown>): string {
  const userId = user._id ? user._id.toString() : (user.id || '')
  return jwt.sign(
    { id: userId, phone: user.phone || '' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions,
  )
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1]
  }
  const cookie = req.headers.cookie
  if (cookie) {
    const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='))
    if (match) return match.split('=')[1]
  }
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
    sendError(res, 401, 'INVALID_TOKEN', 'Yaroqsiz token.')
  }
}
