const prisma = require('../lib/prisma');

function withClient(client) {
  return client || prisma;
}

async function list(where = {}, client) {
  return withClient(client).ejercicio.findMany({ where, orderBy: { id: 'asc' } });
}

async function findById(id, client) {
  return withClient(client).ejercicio.findUnique({
    where: { id },
    include: {
      modulo: { select: { id: true, titulo: true } },
      recompensas: true,
    },
  });
}

async function findByIdWithRewards(id, client) {
  return withClient(client).ejercicio.findUnique({
    where: { id },
    include: { recompensas: true },
  });
}

async function listActiveByUser(usuarioId, client) {
  return withClient(client).ejercicioActivo.findMany({
    where: { usuarioId, estado: 'PENDIENTE' },
    include: { ejercicio: true },
    orderBy: { fechaAsignacion: 'desc' },
    take: 5,
  });
}

async function upsertActive(usuarioId, ejercicioId, client) {
  return withClient(client).ejercicioActivo.upsert({
    where: { usuarioId_ejercicioId: { usuarioId, ejercicioId } },
    update: { estado: 'PENDIENTE' },
    create: { usuarioId, ejercicioId },
    include: { ejercicio: true },
  });
}

async function markResolved(usuarioId, ejercicioId, client) {
  return withClient(client).ejercicioActivo.updateMany({
    where: { usuarioId, ejercicioId, estado: 'PENDIENTE' },
    data: { estado: 'RESUELTO' },
  });
}

async function createResolvedAttempt(data, client) {
  return withClient(client).ejercicioResuelto.create({ data });
}

async function countSolved(usuarioId, client) {
  return withClient(client).ejercicioResuelto.count({ where: { usuarioId, correcto: true } });
}

async function listByModule(moduloId, client) {
  return withClient(client).ejercicio.findMany({
    where: { moduloId },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      dificultad: true,
      lenguaje: true,
      tiempoEstimadoSeg: true,
      moduloId: true,
    },
  });
}

module.exports = {
  list,
  findById,
  findByIdWithRewards,
  listActiveByUser,
  upsertActive,
  markResolved,
  createResolvedAttempt,
  countSolved,
  listByModule,
};
