const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { sendSchema, listQuerySchema } = require('./message.validator');
const ctrl = require('./message.controller');

const router = Router();

router.get('/unread', authenticate, ctrl.unreadCount);
router.get('/', authenticate, validate(listQuerySchema), ctrl.list);
router.post('/', authenticate, validate(sendSchema), ctrl.send);
router.patch('/:id/read', authenticate, ctrl.markRead);

module.exports = router;
