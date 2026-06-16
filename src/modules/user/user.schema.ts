import type { SchemaDefinition } from 'mongoose'

export const userSchemaDef: SchemaDefinition = {
  firstName: { type: String, trim: true, maxlength: 50 },
  lastName: { type: String, trim: true, maxlength: 50 },
  phone: { type: String, unique: true, sparse: true, trim: true },
  email: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, minlength: 6 },
  avatar: { type: String, default: '/avatars/user.svg' },
  role: { type: String, enum: ['user', 'seller', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  provider: { type: String, enum: ['local', 'telegram', 'google'], default: 'local' },
  telegramId: { type: String, unique: true, sparse: true },
  telegramUsername: { type: String },
  name: { type: String, default: '' },
  lastLoginAt: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}
