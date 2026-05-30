const prisma = require('../lib/prisma');
const events = require('../lib/events');
const { EVENTS } = events;
const { validarRespuesta } = require('../lib/validador');
const exerciseRepository = require('../repositories/exerciseRepository');
const rewardService = require('./rewardService');

function publicExercise(exercise) {
  if (!exercise) return null;
  const { solucionesCodigo, ...rest } = exercise;
  return rest;
}

async function listExercises(filters = {}) {
  const where = {};
  if (filters.moduloId) where.moduloId = Number(filters.moduloId);
  if (filters.dificultad) where.dificultad = String(filters.dificultad).toUpperCase();
  if (filters.lenguaje) where.lenguaje = String(filters.lenguaje).toLowerCase();

  const items = await exerciseRepository.list(where);
  return { items: items.map(publicExercise), total: items.length };
}

async function listActive(usuarioId) {
  const items = await exerciseRepository.listActiveByUser(usuarioId);
  const mapped = items.map((a) => ({
    id: a.id,
    estado: a.estado,
    fechaAsignacion: a.fechaAsignacion,
    ejercicio: {
      id: a.ejercicio.id,
      titulo: a.ejercicio.titulo,
      dificultad: a.ejercicio.dificultad,
      lenguaje: a.ejercicio.lenguaje,
    },
  }));

  return { items: mapped, total: mapped.length };
}

async function assignExercise(usuarioId, ejercicioId) {
  const ejercicio = await exerciseRepository.findById(ejercicioId);
  if (!ejercicio) {
    const err = new Error('Ejercicio no encontrado');
    err.status = 404;
    throw err;
  }

  const activo = await exerciseRepository.upsertActive(usuarioId, ejercicio.id);
  return {
    id: activo.id,
    estado: activo.estado,
    fechaAsignacion: activo.fechaAsignacion,
    ejercicio: publicExercise(activo.ejercicio),
  };
}

async function getById(id) {
  const ejercicio = await exerciseRepository.findById(id);
  if (!ejercicio) {
    const err = new Error('Ejercicio no encontrado');
    err.status = 404;
    throw err;
  }
  return publicExercise(ejercicio);
}

async function submitAttempt({ usuarioId, ejercicioId, tipo, respuesta, tiempoResolucionSeg }) {
  const ejercicio = await exerciseRepository.findByIdWithRewards(ejercicioId);
  if (!ejercicio) {
    const err = new Error('Ejercicio no encontrado');
    err.status = 404;
    throw err;
  }

  const { correcto, motivo } = validarRespuesta({ tipo, respuesta, ejercicio });
  const respuestaStr = Array.isArray(respuesta) ? JSON.stringify(respuesta) : respuesta;

  const result = await prisma.$transaction(async (tx) => {
    const intento = await exerciseRepository.createResolvedAttempt({
      ejercicioId: ejercicio.id,
      usuarioId,
      tiempoResolucionSeg,
      correcto,
      tipoRespuesta: tipo,
      respuesta: respuestaStr,
    }, tx);

    const outcome = await rewardService.applyAttemptOutcome({
      tx,
      usuarioId,
      ejercicio,
      correcto,
      tiempoResolucionSeg,
    });

    return { intento, outcome };
  });

  for (const item of result.outcome.emittedEvents) {
    events.emit(item.name, item.payload);
  }
  events.emit(EVENTS.EXERCISE_COMPLETED, {
    usuarioId,
    ejercicioId: ejercicio.id,
    correcto,
    tiempoResolucionSeg,
    attemptId: result.intento.id,
  });

  const solucionEjemplo = !correcto && Array.isArray(ejercicio.solucionesCodigo) && ejercicio.solucionesCodigo.length > 0
    ? ejercicio.solucionesCodigo[0]
    : undefined;

  return {
    correcto,
    motivo,
    tiempoResolucionSeg,
    recompensas: result.outcome.rewards,
    puntosActuales: result.outcome.usuario.puntos,
    monedasActuales: result.outcome.usuario.monedas,
    rachaEjercicios: result.outcome.usuario.rachaEjercicios,
    ...(solucionEjemplo !== undefined && { solucionEjemplo }),
  };
}

module.exports = {
  listExercises,
  listActive,
  assignExercise,
  getById,
  submitAttempt,
};
