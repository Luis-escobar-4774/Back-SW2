const prisma = require('../lib/prisma');
const progressRepository = require('../repositories/progressRepository');
const moduleRepository = require('../repositories/moduleRepository');
const events = require('../lib/events');
const { EVENTS } = events;

async function completeStep(usuarioId, pasoId) {
  const paso = await prisma.paso.findUnique({ where: { id: pasoId } });
  if (!paso) {
    const error = new Error('Paso no encontrado');
    error.status = 404;
    throw error;
  }

  const progreso = await progressRepository.upsertStep(usuarioId, pasoId);

  events.emit(EVENTS.LESSON_COMPLETED, {
    usuarioId,
    pasoId,
    moduloId: paso.moduloId,
    completado: true,
    completadoEn: progreso.completadoEn,
  });

  return progreso;
}

async function uncompleteStep(usuarioId, pasoId) {
  const deleted = await progressRepository.deleteStep(usuarioId, pasoId);
  return deleted;
}

module.exports = { completeStep, uncompleteStep };
