const mongoose = require('mongoose');
const { createModel } = require('../../lib/model');

const userSchemaDef = {
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  phone: { type: String, required: true, unique: true, trim: true },
  avatar: { type: String, default: '/avatars/user.svg' },
  role: { type: String, enum: ['user', 'seller', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
};

const userModel = createModel('User', userSchemaDef);

const mongooseUserSchema = new mongoose.Schema(userSchemaDef, { timestamps: true });
mongooseUserSchema.index({ role: 1, isActive: 1 });

module.exports = userModel;
