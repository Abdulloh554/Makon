/**
 * @file auth.middleware.ts
 * @layer Middleware
 * @responsibility Verify JWT from httpOnly cookie → attach req.user and req.userId
 */

import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { UnauthorizedError } from '../errors/AppError'

interface AccessTokenPayload {
  sub: string
  type: 'access'
  iat: number
  exp: number
}

function extractToken(req: Request): string | null {
  const cookie = req.cookies?.access_token
  if (cookie) {
    return cookie
  }

  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    return header.slice(7)
  }

  return null
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req)

    if (!token) {
      throw new UnauthorizedError('Access token not found. Please log in.')
    }

    const payload = jwt.verify(token, config.jwt.secret) as AccessTokenPayload

    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type.')
    }

    req.userId = payload.sub

    next()
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err)
      return
    }

    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Access token expired.'))
      return
    }

    if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid access token.'))
      return
    }

    next(err)
  }
}

export function generateToken(user: { id: string; role?: string }): string {
  return jwt.sign({ sub: user.id, role: user.role, type: 'access' }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn as string & jwt.SignOptions['expiresIn'],
  })
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req)

    if (!token) {
      next()
      return
    }

    const payload = jwt.verify(token, config.jwt.secret) as AccessTokenPayload

    if (payload.type === 'access') {
      req.userId = payload.sub
    }
  } catch {
    // Token invalid or expired — continue without auth
  }

  next()
}
