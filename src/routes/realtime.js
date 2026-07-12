const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { registerClient } = require('../services/sseService');

const router = express.Router();

router.get('/events', requireAuth, (req, res) => {
  registerClient(req.user.id, res);
});

module.exports = router;
