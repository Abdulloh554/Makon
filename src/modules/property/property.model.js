const mongoose = require('mongoose');
const { createModel } = require('../../lib/model');

const propertySchemaDef = {
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
};

const propertyModel = createModel('Property', propertySchemaDef);

const mongoosePropertySchema = new mongoose.Schema(propertySchemaDef, { timestamps: true });
mongoosePropertySchema.index({ 'location.lat': 1, 'location.lng': 1 });
mongoosePropertySchema.index({ price: 1, type: 1, dealType: 1, status: 1 });
mongoosePropertySchema.index({ sellerId: 1, isActive: 1 });
mongoosePropertySchema.index({ createdAt: -1 });
mongoosePropertySchema.index({ title: 'text', description: 'text' });

module.exports = propertyModel;
