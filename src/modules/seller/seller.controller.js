const sellerService = require('./seller.service');

async function list(req, res, next) {
  try {
    const sellers = await sellerService.list();
    res.json(sellers);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const seller = await sellerService.getById(req.params.id);
    res.json(seller);
  } catch (err) {
    next(err);
  }
}

async function getProperties(req, res, next) {
  try {
    const properties = await sellerService.getProperties(req.params.id);
    res.json(properties);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, getProperties };
