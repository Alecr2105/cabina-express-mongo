const router = require('express').Router();
const c = require('../controllers/musicians');

router.post('/', c.create);
router.get('/', c.list);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
