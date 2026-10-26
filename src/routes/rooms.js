const router = require('express').Router();
const c = require('../controllers/rooms');

router.post('/', c.create);
router.get('/', c.list);
// TODO: GET /stats (aggregate) va aquí, antes de /:id
router.get('/:id', c.get);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.get('/:id/schedule', c.schedule);

module.exports = router;
