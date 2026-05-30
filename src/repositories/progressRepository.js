const prisma = require('../lib/prisma');

function withClient(client) {
  return client || prisma;
}

async function upsertStep(usuarioId, pasoId, client) {
  return withClient(client).usuarioPaso.upsert({
    where: { usuarioId_pasoId: { usuarioId, pasoId } },
    update: { completado: true, completadoEn: new Date() },
    create: { usuarioId, pasoId, completado: true, completadoEn: new Date() },
  });
}

async function deleteStep(usuarioId, pasoId, client) {
  return withClient(client).usuarioPaso.deleteMany({ where: { usuarioId, pasoId } });
}

async function completedStepIds(usuarioId, pasoIds, client) {
  const rows = await withClient(client).usuarioPaso.findMany({
    where: { usuarioId, pasoId: { in: pasoIds }, completado: true },
    select: { pasoId: true },
  });
  return new Set(rows.map((row) => row.pasoId));
}

async function countCompletedByModule(usuarioId, moduloId, client) {
  return withClient(client).usuarioPaso.count({
    where: { usuarioId, completado: true, paso: { moduloId } },
  });
}

module.exports = {
  upsertStep,
  deleteStep,
  completedStepIds,
  countCompletedByModule,
};
