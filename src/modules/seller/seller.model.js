const mongoose = require('mongoose');
const { createModel } = require('../../lib/model');

const sellerSchemaDef = {
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  avatar: { type: String, default: '/avatars/default.svg' },
  rating: { type: Number, default: 5.0, min: 1, max: 5 },
  totalListings: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  documents: [{ type: String }],
  joinedAt: { type: Date, default: Date.now },
};

const sellerModel = createModel('Seller', sellerSchemaDef);

const mongooseSellerSchema = new mongoose.Schema(sellerSchemaDef, { timestamps: true });
mongooseSellerSchema.index({ rating: -1 });
mongooseSellerSchema.index({ verified: 1 });

module.exports = sellerModel;
