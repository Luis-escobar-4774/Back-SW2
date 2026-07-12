const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const authController = require('../controllers/authController');
const emailConfirmationController = require('../controllers/emailConfirmationController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);
router.get('/confirmar-email/:token', emailConfirmationController.confirmEmail);
router.post('/reenviar-confirmacion', requireAuth, emailConfirmationController.resendConfirmation);

module.exports = router;
