/**
 * @file role.guard.ts
 * @layer Middleware
 * @responsibility Role-based access control — checks req.user.role against allowed roles
 */

import type { Request, Response, NextFunction } from 'express'
import type { UserRole } from '@shared/types/user.types'
import { ForbiddenError, UnauthorizedError } from '../errors/AppError'
import { userRepository } from '../modules/user/user.repository'

export function roleGuard(...allowedRoles: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('Authentication required.')
      }

      const user = await userRepository.findById(req.userId)

      if (!user) {
        throw new UnauthorizedError('User not found.')
      }

      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError(`Requires one of roles: ${allowedRoles.join(', ')}`)
      }

      req.user = user
      next()
    } catch (err) {
      next(err)
    }
  }
}
