/**
 * @file auth.service.ts
 * @layer Service
 * @responsibility Auth business logic — login, register, refresh, logout, password reset
 * No req/res objects, no DB calls directly
 */

import jwt, { type SignOptions } from 'jsonwebtoken'
import { randomUUID, randomBytes } from 'node:crypto'
import { config } from '../../config'
import { authRepository } from './auth.repository'
import { userRepository } from '../user/user.repository'
import { sendNotificationEmail } from '../../services/email'
import { UnauthorizedError, NotFoundError, ConflictError, ValidationError } from '../../errors/AppError'
import { sellerModel } from '../seller/seller.model'

interface TokenPair {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
}

interface AuthResult {
  user: {
    id: string
    firstName: string
    lastName: string
    name: string
    email: string
    avatar: string
    role: 'user' | 'seller' | 'admin'
    isVerified: boolean
  }
  tokens: TokenPair
}

function generateTokenPair(userId: string): TokenPair {
  const now = Math.floor(Date.now() / 1000)

  const accessTokenExpiresAt = new Date((now + 15 * 60) * 1000)
  const refreshTokenExpiresAt = new Date((now + 7 * 24 * 60 * 60) * 1000)

  const accessToken = jwt.sign(
    { sub: userId, type: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn } as SignOptions,
  )

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh', jti: randomUUID() },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn } as SignOptions,
  )

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  }
}

function verifyRefreshToken(token: string): { sub: string; jti: string } {
  const payload = jwt.verify(token, config.jwt.refreshSecret) as {
    sub: string
    type: string
    jti: string
  }

  if (payload.type !== 'refresh') {
    throw new UnauthorizedError('Invalid token type.')
  }

  return { sub: payload.sub, jti: payload.jti }
}

// ─── In-memory OTP store (no Redis needed) ──────────────────────────────
const otpStore = new Map<string, { otp: string; firstName: string; lastName: string; expiresAt: number }>()

// Clean expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of otpStore) {
    if (val.expiresAt < now) otpStore.delete(key)
  }
}, 5 * 60 * 1000)

function sanitizeUser(user: {
  id: string
  firstName: string
  lastName: string
  name: string
  email?: string
  avatar: string
  role: 'user' | 'seller' | 'admin'
  isVerified: boolean
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    email: user.email || '',
    avatar: user.avatar,
    role: user.role,
    isVerified: user.isVerified,
  }
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    const result = await authRepository.findUserByEmailWithPassword(email)

    if (!result) {
      throw new NotFoundError('User not found with this email.')
    }

    const isMatch = await authRepository.verifyPassword(password, result.passwordHash)
    if (!isMatch) {
      throw new UnauthorizedError('Invalid password.')
    }

    const tokens = generateTokenPair(result.user.id)

    return {
      user: sanitizeUser(result.user),
      tokens,
    }
  },

  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<AuthResult> {
    const existing = await authRepository.findUserByEmail(email)

    if (existing) {
      throw new ConflictError('This email is already registered.')
    }

    const hashedPassword = await authRepository.hashPassword(password)

    const user = await authRepository.createUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    })

    const tokens = generateTokenPair(user.id)

    return {
      user: sanitizeUser(user),
      tokens,
    }
  },

  async sendRegistrationOtp(
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<{ message: string; devOtp?: string }> {
    const existing = await userRepository.findByEmail(email)
    if (existing) {
      throw new ConflictError('This email is already registered.')
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = Date.now() + 10 * 60 * 1000

    otpStore.set(email, { otp, firstName, lastName, expiresAt })

    try {
      await sendNotificationEmail({
        to: email,
        subject: 'Tasdiqlash kodi',
        text: `Sizning tasdiqlash kodingiz: ${otp}\n\nKod 10 daqiqa davomida amal qiladi.`,
      })
    } catch (err: any) {
      console.error(`[AUTH] Email yuborishda xatolik:`, err.message)
      otpStore.delete(email)
      throw new Error('Email yuborishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.')
    }

    if (config.isDev) {
      console.log(`[DEV OTP] ${email} → Code: ${otp}`)
      return { message: 'Tasdiqlash kodi emailingizga yuborildi.', devOtp: otp }
    }

    return { message: 'Tasdiqlash kodi emailingizga yuborildi.' }
  },

  async verifyRegistrationOtp(
    email: string,
    otp: string,
  ): Promise<AuthResult> {
    const stored = otpStore.get(email)
    if (!stored) {
      throw new ValidationError('Tasdiqlash kodi topilmadi. Iltimos, qayta urinib ko\'ring.')
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email)
      throw new ValidationError('Tasdiqlash kodi muddati tugagan. Qayta yuboring.')
    }

    if (stored.otp !== otp) {
      throw new ValidationError('Noto\'g\'ri tasdiqlash kodi.')
    }

    otpStore.delete(email)

    const existing = await userRepository.findByEmail(email)
    if (existing) {
      throw new ConflictError('This email is already registered.')
    }

    const randomPassword = randomBytes(32).toString('hex')
    const hashedPassword = await authRepository.hashPassword(randomPassword)
    const name = `${stored.firstName} ${stored.lastName}`

    const user = await userRepository.create({
      firstName: stored.firstName,
      lastName: stored.lastName,
      phone: '',
      password: hashedPassword,
      name,
      email,
      role: 'user',
      provider: 'local',
      isVerified: true,
    })

    await sellerModel.create({
      userId: user.id,
      name,
      phone: '',
      avatar: user.avatar,
      rating: 5.0,
      totalListings: 0,
      joinedAt: new Date(),
    })

    try {
      await sendNotificationEmail({
        to: email,
        subject: 'Maskan — akkauntingiz yaratildi',
        text: `Assalomu alaykum, ${stored.firstName}!\n\nMaskan platformasida akkauntingiz muvaffaqiyatli yaratildi.\n\nSizning parolingiz: ${randomPassword}\n\nIltimos, parolni o'zgartirish uchun profilingizga kiring.\n\nHurmat bilan,\nMaskan jamoasi`,
      })
    } catch (err: any) {
      console.error(`[AUTH] PAROL EMAILGA YUBORILMADI! ${email} | ${err.message}`)
    }

    const tokens = generateTokenPair(user.id)

    return {
      user: sanitizeUser(user),
      tokens,
    }
  },

  async refresh(refreshToken: string): Promise<AuthResult> {
    const decoded = verifyRefreshToken(refreshToken)

    const isBlacklisted = await authRepository.isTokenBlacklisted(decoded.jti)
    if (isBlacklisted) {
      throw new UnauthorizedError('Refresh token has been revoked.')
    }

    const user = await authRepository.findUserById(decoded.sub)
    if (!user) {
      throw new UnauthorizedError('User not found.')
    }

    const tokens = generateTokenPair(user.id)

    return {
      user: sanitizeUser(user),
      tokens,
    }
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = verifyRefreshToken(refreshToken)
      const exp = jwt.decode(refreshToken) as { exp: number }
      const expiresAt = new Date(exp.exp * 1000)
      await authRepository.blacklistRefreshToken(decoded.jti, expiresAt)
    } catch {
      // If token is already invalid, just proceed with logout
    }
  },

  async google(idToken: string): Promise<AuthResult> {
    let rawUser: any
    try {
      const { googleLogin: googleAuthFn } = await import('./auth.google')
      const result = await googleAuthFn(idToken)
      rawUser = result.user
    } catch (err: any) {
      throw new UnauthorizedError(err?.message || 'Invalid Google token.')
    }
    const tokens = generateTokenPair(rawUser.id || rawUser._id)
    return {
      user: sanitizeUser(rawUser),
      tokens,
    }
  },

  async firebase(idToken: string): Promise<AuthResult> {
    let rawUser: any
    try {
      const { firebaseLogin: firebaseAuthFn } = await import('./auth.firebase')
      const result = await firebaseAuthFn(idToken)
      rawUser = result.user
    } catch (err: any) {
      throw new UnauthorizedError(err?.message || 'Invalid Firebase token.')
    }
    const tokens = generateTokenPair(rawUser.id || rawUser._id)
    return {
      user: sanitizeUser(rawUser),
      tokens,
    }
  },

  async me(userId: string) {
    const user = await authRepository.findUserById(userId)

    if (!user) {
      throw new NotFoundError('User not found.')
    }

    return sanitizeUser(user)
  },

  async forgotPassword(email: string) {
    const user = await authRepository.findUserByEmail(email)

    if (!user) {
      return { message: 'If this email is registered, a reset link has been sent.' }
    }

    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000)

    await authRepository.setResetToken(user.id, token, expires)

    try {
      await sendNotificationEmail({
        to: email,
        subject: 'Parolni tiklash',
        text: `Parolingizni tiklash uchun quyidagi kodni kiriting: ${token}\n\nKod 1 soat davomida amal qiladi.\n\nAgar parolni tiklashni so'ramagan bo'lsangiz, ushbu xabarni e'tiborsiz qoldiring.`,
      })
    } catch (err: any) {
      console.error(`[AUTH] Password reset email failed:`, err.message)
    }

    return { message: 'If this email is registered, a reset link has been sent.' }
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await authRepository.findByResetToken(token)

    if (!user) {
      throw new NotFoundError('Invalid or expired reset token.')
    }

    const hashedPassword = await authRepository.hashPassword(newPassword)

    await authRepository.updatePassword(user.id, hashedPassword)

    return { message: 'Password has been reset successfully.' }
  },
}
