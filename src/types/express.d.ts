/**
 * @file express.d.ts
 * @layer Types
 * @responsibility Extends Express Request with typed user property
 */

import type { User } from '@shared/types/user.types'

declare global {
  namespace Express {
    interface Request {
      user?: User
      userId?: string
      requestId?: string
      csrfToken?: string
    }
  }
}

export {}
