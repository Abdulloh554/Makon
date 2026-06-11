const propertyService = require('./property.service');

async function list(req, res, next) {
  try {
    const result = await propertyService.list(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const property = await propertyService.getById(req.params.id);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const property = await propertyService.create(req.body, req.userId);
    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const property = await propertyService.update(req.params.id, req.body, req.userId);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

async function deleteProperty(req, res, next) {
  try {
    const result = await propertyService.deleteProperty(req.params.id, req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, deleteProperty };
