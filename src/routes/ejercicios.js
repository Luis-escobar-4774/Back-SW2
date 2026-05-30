const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const ejerciciosController = require('../controllers/ejerciciosController');

const router = express.Router();

router.get('/', ejerciciosController.list);
router.get('/activos', requireAuth, ejerciciosController.activos);
router.post('/activos', requireAuth, ejerciciosController.asignar);
router.get('/:id', ejerciciosController.detalle);
router.post('/:id/submit', requireAuth, ejerciciosController.submit);

module.exports = router;
