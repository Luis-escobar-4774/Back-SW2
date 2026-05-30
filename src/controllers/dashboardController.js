const dashboardService = require('../services/dashboardService');
const { rankingServiceCached } = require('../services/rankingDecorators');

async function index(req, res, next) {
  try {
    const result = await dashboardService.getDashboard(req.user.id);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

async function ranking(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const result = await rankingServiceCached.getRanking(limit);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function misCartas(req, res, next) {
  try {
    const result = await dashboardService.getInventory(req.user.id);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

module.exports = { index, ranking, misCartas };
