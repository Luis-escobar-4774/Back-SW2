const express = require('express');
const optionalAuth = require('../middleware/optionalAuth');
const modulosController = require('../controllers/modulosController');

const router = express.Router();

router.get('/', optionalAuth, modulosController.list);
router.get('/:id', optionalAuth, modulosController.detalle);
router.get('/:id/ejercicios', modulosController.ejercicios);

module.exports = router;
