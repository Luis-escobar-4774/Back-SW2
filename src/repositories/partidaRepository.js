const prisma = require('../lib/prisma');

function withClient(client) {
  return client || prisma;
}

async function create({ usuarioId, ronda, estado }, client) {
  return withClient(client).partida.create({
    data: { usuarioId, ronda, estado },
  });
}

async function findById(id, client) {
  return withClient(client).partida.findUnique({ where: { id } });
}

/** Actualiza el snapshot de estado de una partida en curso (sin finalizar). */
async function actualizarEstado(id, estado, client) {
  return withClient(client).partida.update({
    where: { id },
    data: { estado, ronda: estado.ronda },
  });
}

/** Cierra la partida (VICTORIA/DERROTA/ABANDONO) y fija finalizadaEn. */
async function finalizar(id, { resultado, puntosGanados = 0, estado, ronda }, client) {
  return withClient(client).partida.update({
    where: { id },
    data: {
      resultado,
      puntosGanados,
      estado,
      ronda,
      finalizadaEn: new Date(),
    },
  });
}

module.exports = { create, findById, actualizarEstado, finalizar };
