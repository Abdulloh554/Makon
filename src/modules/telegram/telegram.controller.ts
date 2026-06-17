import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { config } from '../../config'
import { userModel } from '../user/user.model'
import { sendSuccess, sendError } from '../../utils/response'

/**
 * Verify Telegram Login Widget data
 * https://core.telegram.org/widgets/login
 */
function verifyTelegramData(query: Record<string, string>): boolean {
  const botToken = config.telegramBotToken
  if (!botToken || botToken === 'your-telegram-bot-token') return false

  const { hash, ...data } = query
  if (!hash) return false

  const secret = crypto.createHash('sha256').update(botToken).digest()
  const checkString = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('\n')

  const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex')
  return hmac === hash
}

export async function telegramAuth(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const query = req.query as Record<string, string>

    if (!verifyTelegramData(query)) {
      sendError(res, 401, 'INVALID_TELEGRAM_HASH', 'Telegram ma\'lumotlari tasdiqlanmadi')
      return
    }

    const telegramId = query.id
    const telegramUsername = query.username || ''
    const firstName = query.first_name || ''
    const lastName = query.last_name || ''
    const photoUrl = query.photo_url || ''

    const telegramData = {
      telegramId,
      telegramUsername,
      name: `${firstName} ${lastName}`.trim() || firstName,
      avatar: photoUrl || '/avatars/user.svg',
      isVerified: true,
      lastLoginAt: new Date(),
    }

    let user = await userModel.findOne({ telegramId })
    if (!user) {
      user = await userModel.create({
        ...telegramData,
        email: `tg_${telegramId}@telegram.local`,
        password: crypto.randomBytes(32).toString('hex'),
        provider: 'telegram',
        role: 'user',
      })
    } else {
      await userModel.findOneAndUpdate({ telegramId }, { $set: telegramData })
      user = await userModel.findOne({ telegramId })!
    }

    // Generate JWT tokens
    const accessToken = createAccessToken(user._id.toString(), user.role)
    const refreshToken = createRefreshToken(user._id.toString())

    setRefreshCookie(res, refreshToken)

    sendSuccess(res, {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.avatar,
        isVerified: user.isVerified,
        telegramUsername,
      },
    })
  } catch (err) {
    sendError(res, 500, 'TELEGRAM_AUTH_ERROR', 'Telegram autentifikatsiyada xatolik')
  }
}

function createAccessToken(userId: string, role: string): string {
  const jwt = require('jsonwebtoken')
  return jwt.sign({ userId, role }, config.jwt.secret, { expiresIn: '15m' })
}

function createRefreshToken(userId: string): string {
  const jwt = require('jsonwebtoken')
  return jwt.sign({ userId, type: 'refresh' }, config.jwt.refreshSecret, { expiresIn: '7d' })
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth/refresh',
  })
}
