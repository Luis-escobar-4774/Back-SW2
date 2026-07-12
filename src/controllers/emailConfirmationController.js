const emailConfirmationService = require('../services/emailConfirmationService');

async function confirmEmail(req, res, next) {
  try {
    const result = await emailConfirmationService.confirmEmail(req.params.token);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

async function resendConfirmation(req, res, next) {
  try {
    const result = await emailConfirmationService.resendConfirmation(req.user.id);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

module.exports = { confirmEmail, resendConfirmation };
