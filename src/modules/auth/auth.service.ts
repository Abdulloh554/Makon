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
import { UnauthorizedError, NotFoundError, ConflictError } from '../../errors/AppError'

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
    phone: string
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

function sanitizeUser(user: {
  id: string
  firstName: string
  lastName: string
  name: string
  phone: string
  avatar: string
  role: 'user' | 'seller' | 'admin'
  isVerified: boolean
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    isVerified: user.isVerified,
  }
}

export const authService = {
  async login(phone: string, password: string): Promise<AuthResult> {
    const result = await authRepository.findUserByPhoneWithPassword(phone)

    if (!result) {
      throw new NotFoundError('User not found with this phone number.')
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
    phone: string,
    password: string,
  ): Promise<AuthResult> {
    const existing = await authRepository.findUserByPhone(phone)

    if (existing) {
      throw new ConflictError('This phone number is already registered.')
    }

    const hashedPassword = await authRepository.hashPassword(password)

    const user = await authRepository.createUser({
      firstName,
      lastName,
      phone,
      password: hashedPassword,
    })

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

  async me(userId: string) {
    const user = await authRepository.findUserById(userId)

    if (!user) {
      throw new NotFoundError('User not found.')
    }

    return sanitizeUser(user)
  },

  async forgotPassword(phone: string) {
    const user = await authRepository.findUserByPhone(phone)

    if (!user) {
      return { message: 'If this phone is registered, a reset code has been sent.' }
    }

    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000)

    await authRepository.setResetToken(user.id, token, expires)

    if (config.isDev) {
      console.log(`[DEV] Password reset token for ${phone}: ${token}`)
    }

    return { message: 'If this phone is registered, a reset code has been sent.' }
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
