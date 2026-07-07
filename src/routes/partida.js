const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const partidaController = require('../controllers/partidaController');

const router = express.Router();

router.post('/', requireAuth, partidaController.iniciar);
router.get('/:id', requireAuth, partidaController.obtener);
router.post('/:id/jugar', requireAuth, partidaController.jugar);
router.post('/:id/pasar', requireAuth, partidaController.pasar);
router.post('/:id/abandonar', requireAuth, partidaController.abandonar);

module.exports = router;
