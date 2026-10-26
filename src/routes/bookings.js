const router = require('express').Router();
const c = require('../controllers/bookings');

router.post('/', c.create);
router.get('/', c.list);
router.get('/stats', c.stats);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.patch('/:id/cancel', c.cancel);

module.exports = router;
