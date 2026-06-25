import type { SchemaDefinition } from 'mongoose'

export const messageSchemaDef: SchemaDefinition = {
  fromUserId: { type: String, required: true },
  toUserId: { type: String, required: true },
  conversationId: { type: String, required: true, index: true },
  propertyId: { type: String, default: 'general' },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
}
