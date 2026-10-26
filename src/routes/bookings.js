const router = require('express').Router();
const c = require('../controllers/bookings');

// TODO: POST /, PUT /:id y PATCH /:id/cancel
router.get('/', c.list);
router.get('/stats', c.stats);
router.get('/:id', c.get);

module.exports = router;
