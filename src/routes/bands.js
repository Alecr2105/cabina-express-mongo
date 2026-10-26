const router = require('express').Router();
const c = require('../controllers/bands');

router.post('/', c.create);
router.get('/', c.list);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.get('/:id/musicians', c.musicians);
router.get('/:id/bookings', c.bookings);

module.exports = router;
