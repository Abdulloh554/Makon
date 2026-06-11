const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { createSchema, updateSchema, listQuerySchema } = require('./property.validator');
const ctrl = require('./property.controller');

const router = Router();

router.get('/', validate(listQuerySchema), ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, validate(createSchema), ctrl.create);
router.patch('/:id', authenticate, validate(updateSchema), ctrl.update);
router.delete('/:id', authenticate, ctrl.deleteProperty);

module.exports = router;
