const { Router } = require('express');
const ctrl = require('./seller.controller');

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/properties', ctrl.getProperties);

module.exports = router;
