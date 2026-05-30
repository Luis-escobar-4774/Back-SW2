const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/', requireAuth, dashboardController.index);
router.get('/ranking', dashboardController.ranking);
router.get('/mis-cartas', requireAuth, dashboardController.misCartas);

module.exports = router;
