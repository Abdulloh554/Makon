import type { Request, Response } from 'express'
import type { HttpError } from 'http-errors'
import { doubleCsrf } from 'csrf-csrf'
import { config } from '../config'

const {
  generateCsrfToken,
  doubleCsrfProtection,
  invalidCsrfTokenError,
}: {
  generateCsrfToken: (req: Request, res: Response, options?: Record<string, unknown>) => string
  doubleCsrfProtection: (req: Request, res: Response, next: () => void) => void
  invalidCsrfTokenError: HttpError
} = doubleCsrf({
  getSecret: () => config.csrf.secret,
  getSessionIdentifier: (req: Request) => req.ip ?? req.socket.remoteAddress ?? 'unknown',
  cookieName: 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: config.isProduction,
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string,
})

export { generateCsrfToken, doubleCsrfProtection, invalidCsrfTokenError }