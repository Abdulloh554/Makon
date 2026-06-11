const userModel = require('../user/user.model');
const sellerModel = require('../seller/seller.model');
const propertyModel = require('../property/property.model');
const messageModel = require('../message/message.model');
const { generateToken } = require('../../middleware/auth');
const { NotFoundError, ConflictError } = require('../../lib/errors');

async function login(phone) {
  const user = await userModel.findOne({ phone });
  if (!user) {
    throw new NotFoundError('Foydalanuvchi topilmadi. Avval ro\'yxatdan o\'ting.');
  }
  const token = generateToken(user);
  return { token, user: user.toJSON() };
}

async function register(name, phone) {
  const existingUser = await userModel.findOne({ phone });
  if (existingUser) {
    throw new ConflictError('Ushbu telefon raqami allaqachon ro\'yxatdan o\'tgan.');
  }

  const user = await userModel.create({ name, phone });

  await sellerModel.create({
    userId: user._id ? user._id.toString() : user.id,
    name: user.name,
    phone: user.phone,
    avatar: user.avatar || '/avatars/user.svg',
    rating: 5.0,
    totalListings: 0,
    joinedAt: new Date(),
  });

  const token = generateToken(user);
  return { token, user: user.toJSON() };
}

async function me(userId) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new NotFoundError('Foydalanuvchi topilmadi.');
  }
  return user.toJSON();
}

async function deleteAccount(userId) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new NotFoundError('Foydalanuvchi topilmadi.');
  }

  const seller = await sellerModel.findOne({ userId });
  if (seller) {
    const sellerId = seller._id ? seller._id.toString() : seller.id;
    const props = await propertyModel.find({ sellerId });
    for (const p of props) {
      await propertyModel.findByIdAndDelete(p._id ? p._id.toString() : p.id);
    }
    await sellerModel.findByIdAndDelete(sellerId);
  }

  const msgs = await messageModel.find({
    $or: [{ fromUserId: userId }, { toUserId: userId }],
  });
  for (const m of msgs) {
    await messageModel.findByIdAndDelete(m._id ? m._id.toString() : m.id);
  }

  await userModel.findByIdAndDelete(userId);

  return { message: 'Akkount va barcha ma\'lumotlar o\'chirildi.' };
}

module.exports = { login, register, me, deleteAccount };
