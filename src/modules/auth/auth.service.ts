import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { userModel } from '../user/user.model'
import { sellerModel } from '../seller/seller.model'
import { propertyModel } from '../property/property.model'
import { messageModel } from '../message/message.model'
import { NotFoundError, ConflictError, UnauthorizedError } from '../../utils/errors'
import { config } from '../../config'

async function getUserId(doc: Record<string, unknown>): Promise<string> {
  return String(doc._id ?? doc.id ?? '')
}

export async function login(phone: string, password: string) {
  const user = await userModel.findOne({ phone })
  if (!user) {
    throw new NotFoundError('Foydalanuvchi topilmadi. Avval ro\'yxatdan o\'ting.')
  }

  const userPassword = user.password as string
  const isMatch = await bcrypt.compare(password, userPassword)
  if (!isMatch) {
    throw new UnauthorizedError('Noto\'g\'ri parol.')
  }

  await userModel.findOneAndUpdate({ phone }, { lastLoginAt: new Date() })

  const userJson = user.toJSON()
  delete userJson.password
  return { user: userJson }
}

export async function register(firstName: string, lastName: string, phone: string, password: string) {
  const existingUser = await userModel.findOne({ phone })
  if (existingUser) {
    throw new ConflictError('Ushbu telefon raqami allaqachon ro\'yxatdan o\'tgan.')
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  const user = await userModel.create({
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    phone,
    password: hashedPassword,
  })

  const userId = await getUserId(user)
  await sellerModel.create({
    userId,
    name: `${firstName} ${lastName}`,
    phone: user.phone as string,
    avatar: (user.avatar as string) || '/avatars/user.svg',
    rating: 5.0,
    totalListings: 0,
    joinedAt: new Date(),
  })

  const userJson = user.toJSON()
  delete userJson.password
  return { user: userJson }
}

export async function me(userId: string) {
  const user = await userModel.findById(userId)
  if (!user) {
    throw new NotFoundError('Foydalanuvchi topilmadi.')
  }
  const userJson = user.toJSON()
  delete userJson.password
  return userJson
}

export async function deleteAccount(userId: string) {
  const user = await userModel.findById(userId)
  if (!user) {
    throw new NotFoundError('Foydalanuvchi topilmadi.')
  }

  const seller = await sellerModel.findOne({ userId })
  if (seller) {
    const sellerId = await getUserId(seller)
    const props = await propertyModel.find({ sellerId })
    for (const p of props) {
      const pid = await getUserId(p)
      await propertyModel.findByIdAndDelete(pid)
    }
    await sellerModel.findByIdAndDelete(sellerId)
  }

  const msgs = await messageModel.find({
    $or: [{ fromUserId: userId }, { toUserId: userId }],
  })
  for (const m of msgs) {
    const mid = await getUserId(m)
    await messageModel.findByIdAndDelete(mid)
  }

  await userModel.findByIdAndDelete(userId)
  return { message: 'Akkount va barcha ma\'lumotlar o\'chirildi.' }
}

export async function forgotPassword(phone: string) {
  const user = await userModel.findOne({ phone })
  if (!user) {
    return { message: 'Agar telefon raqam mavjud bo\'lsa, kod yuborildi.' }
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000)

  await userModel.findOneAndUpdate({ phone }, {
    $set: {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    },
  })

  if (config.isDev) {
    console.log(`[DEV] Password reset token for ${phone}: ${token}`)
  }

  return { message: 'Agar telefon raqam mavjud bo\'lsa, kod yuborildi.' }
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await userModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  })
  if (!user) {
    throw new NotFoundError('Yaroqsiz yoki muddati o\'tgan token.')
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(newPassword, salt)

  await userModel.findOneAndUpdate(
    { resetPasswordToken: token },
    {
      $set: { password: hashedPassword },
      $unset: { resetPasswordToken: '', resetPasswordExpires: '' },
    },
  )

  return { message: 'Parol muvaffaqiyatli yangilandi.' }
}
