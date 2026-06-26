/**
 * @file user.types.ts
 * @layer Shared
 * @responsibility User and auth-related types
 */

export const USER_ROLES = ['user', 'seller', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const AUTH_PROVIDERS = ['local', 'telegram', 'google', 'firebase'] as const
export type AuthProvider = (typeof AUTH_PROVIDERS)[number]

export interface User {
  id: string
  firstName: string
  lastName: string
  name: string
  phone: string
  email?: string
  avatar: string
  role: UserRole
  isActive: boolean
  isVerified: boolean
  provider: AuthProvider
  firebaseUid?: string
  telegramId?: string
  telegramUsername?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  phone: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  phone: string
  password: string
}

export interface AuthResponse {
  user: User
  csrfToken: string
}

export interface RefreshResponse {
  user: User
  csrfToken: string
}

export interface ForgotPasswordRequest {
  phone: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}
