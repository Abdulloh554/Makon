const mongoose = require('mongoose');
const { createModel } = require('../../lib/model');

const messageSchemaDef = {
  fromUserId: { type: String, required: true },
  toUserId: { type: String, required: true },
  propertyId: { type: String, default: 'general' },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
};

const messageModel = createModel('Message', messageSchemaDef);

const mongooseMessageSchema = new mongoose.Schema(messageSchemaDef, { timestamps: true });
mongooseMessageSchema.index({ fromUserId: 1, toUserId: 1, createdAt: -1 });
mongooseMessageSchema.index({ toUserId: 1, read: 1 });

module.exports = messageModel;
