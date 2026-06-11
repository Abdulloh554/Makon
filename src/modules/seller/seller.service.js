const sellerModel = require('./seller.model');
const propertyModel = require('../property/property.model');
const cache = require('../../lib/cache');
const { NotFoundError } = require('../../lib/errors');

async function list() {
  return cache.wrap('sellers:list', async () => {
    const sellers = await sellerModel.find().sort({ joinedAt: -1 });
    return sellers.map((s) => s.toJSON());
  }, 60);
}

async function getById(id) {
  return cache.wrap(`seller:${id}`, async () => {
    const seller = await sellerModel.findById(id);
    if (!seller) throw new NotFoundError('Seller not found');
    return seller.toJSON();
  }, 120);
}

async function getProperties(sellerId) {
  const properties = await propertyModel.find({ sellerId }).sort({ createdAt: -1 });
  return properties.map((p) => p.toJSON());
}

module.exports = { list, getById, getProperties };
