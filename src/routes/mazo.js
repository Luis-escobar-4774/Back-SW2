const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const deckController = require('../controllers/deckController');

const router = express.Router();

router.get('/', requireAuth, deckController.show);
router.put('/', requireAuth, deckController.update);

module.exports = router;
