import { userModel } from './user.model'
import type { User } from '@shared/types/user.types'

function toUser(doc: unknown): User | null {
  if (!doc) {
    return null
  }
  const d = doc as Record<string, unknown>
  return {
    id: String(d.id || d._id),
    firstName: d.firstName as string,
    lastName: d.lastName as string,
    name: d.name as string,
    phone: d.phone as string,
    email: d.email as string | undefined,
    avatar: d.avatar as string,
    role: d.role as 'user' | 'seller' | 'admin',
    isActive: d.isActive as boolean,
    isVerified: d.isVerified as boolean,
    provider: d.provider as 'local' | 'telegram' | 'google' | 'firebase',
    firebaseUid: d.firebaseUid as string | undefined,
    telegramId: d.telegramId as string | undefined,
    telegramUsername: d.telegramUsername as string | undefined,
    lastLoginAt: d.lastLoginAt as string | undefined,
    createdAt: d.createdAt as string,
    updatedAt: d.updatedAt as string,
  }
}

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const doc = await (userModel as any).findById(id)
    return toUser(doc)
  },

  async findByPhone(phone: string): Promise<User | null> {
    const doc = await (userModel as any).findOne({ phone })
    return toUser(doc)
  },

  async findByPhoneWithPassword(phone: string): Promise<{ user: User; passwordHash: string } | null> {
    const doc = await (userModel as any).findOne({ phone })
    if (!doc) return null
    const raw = typeof doc.toJSON === 'function' ? doc.toJSON() : doc
    return {
      passwordHash: raw.password as string,
      user: toUser(doc)!,
    }
  },

  async findByEmail(email: string): Promise<User | null> {
    const doc = await (userModel as any).findOne({ email })
    return toUser(doc)
  },

  async findByEmailWithPassword(email: string): Promise<{ user: User; passwordHash: string } | null> {
    const doc = await (userModel as any).findOne({ email })
    if (!doc) return null
    const raw = typeof doc.toJSON === 'function' ? doc.toJSON() : doc
    return {
      passwordHash: raw.password as string,
      user: toUser(doc)!,
    }
  },

  async create(data: {
    firstName: string
    lastName: string
    phone?: string
    password: string
    name: string
    email?: string
    isVerified?: boolean
    avatar?: string
    role?: 'user' | 'seller' | 'admin'
    provider?: 'local' | 'telegram' | 'google' | 'firebase'
    firebaseUid?: string
  }): Promise<User> {
    const doc = await (userModel as any).create(data)
    const json = typeof doc.toJSON === 'function' ? doc.toJSON() : doc
    return {
      id: String(json.id || json._id),
      firstName: json.firstName as string,
      lastName: json.lastName as string,
      name: json.name as string,
      phone: json.phone as string || '',
      email: json.email as string | undefined,
      avatar: json.avatar as string,
      role: json.role as 'user' | 'seller' | 'admin',
      isActive: json.isActive as boolean,
      isVerified: json.isVerified as boolean,
      provider: json.provider as 'local' | 'telegram' | 'google',
      telegramId: json.telegramId as string | undefined,
      telegramUsername: json.telegramUsername as string | undefined,
      lastLoginAt: json.lastLoginAt as string | undefined,
      createdAt: json.createdAt as string,
      updatedAt: json.updatedAt as string,
    }
  },

  async updateById(id: string, updates: Partial<User>): Promise<User | null> {
    const doc = await (userModel as any).findByIdAndUpdate(id, { $set: updates }, { new: true })
    return toUser(doc)
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await (userModel as any).findByIdAndDelete(id)
    return result !== null
  },

  async findByResetToken(token: string): Promise<User | null> {
    const doc = await (userModel as any).findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    })
    return toUser(doc)
  },

  async setResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
    await (userModel as any).findByIdAndUpdate(id, {
      $set: {
        resetPasswordToken: token,
        resetPasswordExpires: expiresAt,
      },
    })
  },

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await (userModel as any).findByIdAndUpdate(id, {
      $set: { password: hashedPassword },
      $unset: { resetPasswordToken: '', resetPasswordExpires: '' },
    })
  },
}
