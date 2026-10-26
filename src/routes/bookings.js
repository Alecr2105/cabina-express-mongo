const router = require('express').Router();
const c = require('../controllers/bookings');

// TODO: POST /, PUT /:id y PATCH /:id/cancel
router.get('/', c.list);
// TODO: GET /stats (aggregate) va aquí, antes de /:id
router.get('/:id', c.get);

module.exports = router;
