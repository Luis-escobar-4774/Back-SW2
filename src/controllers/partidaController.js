const partidaService = require('../services/partidaService');
const { jugarSchema } = require('../validators/partida.validator');

function invalidId(res) {
  return res.status(400).json({ error: 'id invalido' });
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    invalidId(res);
    return null;
  }
  return id;
}

async function iniciar(req, res, next) {
  try {
    const result = await partidaService.iniciarPartida(req.user.id);
    return res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

async function obtener(req, res, next) {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const result = await partidaService.obtenerPartida(req.user.id, id);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

async function jugar(req, res, next) {
  const id = parseId(req, res);
  if (id === null) return;

  const parsed = jugarSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const result = await partidaService.jugarCarta(req.user.id, id, parsed.data.cartaId);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

async function pasar(req, res, next) {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const result = await partidaService.pasarTurno(req.user.id, id);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

async function abandonar(req, res, next) {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const result = await partidaService.abandonarPartida(req.user.id, id);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

module.exports = { iniciar, obtener, jugar, pasar, abandonar };
