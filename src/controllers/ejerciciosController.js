const exerciseService = require('../services/exerciseService');
const { assignSchema, submitSchema } = require('../validators/exercise.validator');

function invalidId(res) {
  return res.status(400).json({ error: 'id invalido' });
}

async function list(req, res, next) {
  try {
    const result = await exerciseService.listExercises(req.query);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function activos(req, res, next) {
  try {
    const result = await exerciseService.listActive(req.user.id);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function asignar(req, res, next) {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const result = await exerciseService.assignExercise(req.user.id, parsed.data.ejercicioId);
    return res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

async function detalle(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return invalidId(res);
    const result = await exerciseService.getById(id);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

async function submit(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return invalidId(res);

  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const result = await exerciseService.submitAttempt({
      usuarioId: req.user.id,
      ejercicioId: id,
      ...parsed.data,
    });
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

module.exports = { list, activos, asignar, detalle, submit };
