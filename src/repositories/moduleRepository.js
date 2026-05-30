const prisma = require('../lib/prisma');

function withClient(client) {
  return client || prisma;
}

async function listAll(client) {
  return withClient(client).modulo.findMany({
    orderBy: { orden: 'asc' },
    include: {
      pasos: { select: { id: true } },
      ejercicios: { select: { id: true } },
    },
  });
}

async function findById(id, client) {
  return withClient(client).modulo.findUnique({
    where: { id },
    include: { pasos: { orderBy: { orden: 'asc' } } },
  });
}

async function listExercises(moduloId, client) {
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
    },
  });
}

module.exports = {
  listAll,
  findById,
  listExercises,
};
