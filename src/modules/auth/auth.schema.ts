/**
 * @file auth.schema.ts
 * @layer Schema
 * @responsibility Zod validation schemas for auth endpoints
 */

import { z } from 'zod'

const phoneSchema = z.string()
  .min(1, 'Phone number is required')
  .regex(/^\+998\d{9}$/, 'Invalid Uzbekistan phone number format (+998901234567)')

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters')
    .trim(),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters')
    .trim(),
  phone: phoneSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
})

export const forgotPasswordSchema = z.object({
  phone: phoneSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
