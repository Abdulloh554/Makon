const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('../lib/errors');
const userModel = require('../modules/user/user.model');

function generateToken(user) {
  return jwt.sign(
    { id: user._id ? user._id.toString() : user.id, phone: user.phone },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await userModel.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('Foydalanuvchi topilmadi.');
    }
    req.user = user;
    req.userId = user._id ? user._id.toString() : user.id;
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    return res.status(401).json({ error: 'Yaroqsiz token.', code: 'INVALID_TOKEN' });
  }
}

module.exports = { authenticate, generateToken };
