const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const pasosController = require('../controllers/pasosController');

const router = express.Router();

router.post('/:id/completar', requireAuth, pasosController.completar);
router.delete('/:id/completar', requireAuth, pasosController.descompletar);

module.exports = router;
