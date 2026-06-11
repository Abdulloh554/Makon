const authService = require('./auth.service');

async function login(req, res, next) {
  try {
    const { phone } = req.body;
    const result = await authService.login(phone);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { name, phone } = req.body;
    const result = await authService.register(name, phone);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.me(req.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const result = await authService.deleteAccount(req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register, me, deleteAccount };
