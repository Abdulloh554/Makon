const propertyModel = require('./property.model');
const sellerModel = require('../seller/seller.model');
const cache = require('../../lib/cache');
const { NotFoundError, ForbiddenError } = require('../../lib/errors');

async function list(filters) {
  const cacheKey = `properties:${JSON.stringify(filters)}`;
  return cache.wrap(cacheKey, async () => {
    const filter = {};
    if (filters.dealType) filter.dealType = filters.dealType;
    if (filters.propertyType) filter.type = filters.propertyType;
    if (filters.status) filter.status = filters.status;
    if (filters.minPrice || filters.maxPrice) {
      filter.price = {};
      if (filters.minPrice) filter.price.$gte = filters.minPrice;
      if (filters.maxPrice) filter.price.$lte = filters.maxPrice;
    }
    if (filters.search) {
      filter.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (Number(filters.page) - 1) * Number(filters.limit);
    const [properties, total] = await Promise.all([
      propertyModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(filters.limit)),
      propertyModel.countDocuments(filter),
    ]);

    return {
      data: properties.map((p) => p.toJSON()),
      total,
      page: Number(filters.page),
      totalPages: Math.ceil(total / Number(filters.limit)),
    };
  }, 60);
}

async function getById(id) {
  const cacheKey = `property:${id}`;
  return cache.wrap(cacheKey, async () => {
    const property = await propertyModel.findById(id);
    if (!property) throw new NotFoundError('Property not found');
    return property.toJSON();
  }, 120);
}

async function create(data, userId) {
  const seller = await sellerModel.findOne({ userId });
  if (!seller) {
    throw new ForbiddenError('Siz sotuvchi emassiz. Avval sotuvchi sifatida ro\'yxatdan o\'ting.');
  }

  const property = await propertyModel.create({ ...data, sellerId: seller._id ? seller._id.toString() : seller.id });

  await sellerModel.findByIdAndUpdate(seller._id ? seller._id.toString() : seller.id, { $inc: { totalListings: 1 } });

  await cache.delPattern('properties:*');
  return property.toJSON();
}

async function update(id, data, userId) {
  const property = await propertyModel.findById(id);
  if (!property) throw new NotFoundError('Property not found');

  const seller = await sellerModel.findOne({ userId });
  if (!seller || (property.sellerId !== seller._id.toString() && property.sellerId !== seller.id)) {
    throw new ForbiddenError('Siz faqat o\'z elonlaringizni tahrirlashingiz mumkin.');
  }

  Object.assign(property, data);
  await property.save();

  await cache.delPattern('properties:*');
  await cache.del(`property:${id}`);
  return property.toJSON();
}

async function deleteProperty(id, userId) {
  const property = await propertyModel.findById(id);
  if (!property) throw new NotFoundError('Property not found');

  const seller = await sellerModel.findOne({ userId });
  if (!seller || (property.sellerId !== seller._id.toString() && property.sellerId !== seller.id)) {
    throw new ForbiddenError('Siz faqat o\'z elonlaringizni o\'chirishingiz mumkin.');
  }

  await propertyModel.findByIdAndDelete(id);
  await sellerModel.findByIdAndUpdate(seller._id ? seller._id.toString() : seller.id, { $inc: { totalListings: -1 } });

  await cache.delPattern('properties:*');
  await cache.del(`property:${id}`);
  return { message: 'Elon o\'chirildi.' };
}

module.exports = { list, getById, create, update, deleteProperty };
