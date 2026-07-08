/**
 * @file auth.schema.ts
 * @layer Schema
 * @responsibility Zod validation schemas for auth endpoints
 */

import { z } from 'zod'

const phoneSchema = z.string().min(1, 'Phone is required')

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  username: z.string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must be at most 30 characters')
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

export const sendOtpSchema = z.object({
  phone: phoneSchema,
  username: z.string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must be at most 30 characters')
    .trim(),
})

export const verifyRegistrationSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type VerifyRegistrationInput = z.infer<typeof verifyRegistrationSchema>
