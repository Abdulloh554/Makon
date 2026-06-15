import type { SchemaDefinition } from 'mongoose'

export const propertySchemaDef: SchemaDefinition = {
  sellerId: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '', maxlength: 2000 },
  price: { type: Number, required: true },
  type: {
    type: String,
    enum: ['apartment', 'house', 'cottage', 'dacha', 'commercial', 'land'],
    required: true,
  },
  dealType: {
    type: String,
    enum: ['daily', 'sale', 'rent', 'installment'],
    required: true,
  },
  status: {
    type: String,
    enum: ['ready', 'half-ready', 'land', 'sold'],
    default: 'ready',
  },
  rooms: { type: Number, default: 0 },
  area: { type: Number, default: 0 },
  floor: { type: Number },
  totalFloors: { type: Number },
  installmentMonths: { type: Number },
  installmentPrice: { type: Number },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    address: { type: String, default: '' },
    district: { type: String },
    city: { type: String, default: 'Tashkent' },
  },
  images: [{ type: String }],
  floorPlan: { type: Object },
  views: { type: Number, default: 0 },
  favorites: [{ type: String }],
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
}
