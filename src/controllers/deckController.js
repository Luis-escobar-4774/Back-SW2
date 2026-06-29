const deckService = require('../services/deckService');

async function show(req, res, next) {
  try {
    const result = await deckService.getDeck(req.user.id);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await deckService.saveDeck(req.user.id, req.body.cartaIds);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

module.exports = { show, update };
