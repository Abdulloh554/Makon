/**
 * @file index.ts
 * @layer Backend Constants
 * @responsibility Re-exports shared constants for backward compatibility
 */

export { ERROR_CODES } from '@shared/types/api.types'
export type { ErrorCode } from '@shared/types/api.types'

export {
  PROPERTY_TYPES,
  DEAL_TYPES,
  PROPERTY_STATUSES,
} from '@shared/types/property.types'
export type {
  PropertyType,
  DealType,
  PropertyStatus,
} from '@shared/types/property.types'

export { USER_ROLES } from '@shared/types/user.types'
export type { UserRole } from '@shared/types/user.types'
