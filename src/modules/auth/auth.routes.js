const { Router } = require('express');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { loginSchema, registerSchema } = require('./auth.validator');
const ctrl = require('./auth.controller');

const router = Router();

router.post('/login', validate(loginSchema), ctrl.login);
router.post('/register', validate(registerSchema), ctrl.register);
router.get('/me', authenticate, ctrl.me);
router.delete('/account', authenticate, ctrl.deleteAccount);

module.exports = router;
