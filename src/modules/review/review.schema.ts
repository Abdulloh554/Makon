import type { SchemaDefinition } from 'mongoose'

export const reviewSchemaDef: SchemaDefinition = {
  sellerId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
}
