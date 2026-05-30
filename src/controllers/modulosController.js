const learningModuleService = require('../services/learningModuleService');

async function list(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const result = await learningModuleService.listModules(userId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function detalle(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });
    const userId = req.user?.id || null;
    const result = await learningModuleService.getModule(id, userId);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

async function ejercicios(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });
    const result = await learningModuleService.getModuleExercises(id);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

module.exports = { list, detalle, ejercicios };
