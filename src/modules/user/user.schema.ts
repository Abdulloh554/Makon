import type { SchemaDefinition } from 'mongoose'

export const userSchemaDef: SchemaDefinition = {
  firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '/avatars/user.svg' },
  role: { type: String, enum: ['user', 'seller', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}
