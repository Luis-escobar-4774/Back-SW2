const prisma = require('../lib/prisma');

function withClient(client) {
  return client || prisma;
}

async function findDeck(usuarioId, client) {
  return withClient(client).usuarioCarta.findMany({
    where: { usuarioId, enMazo: true },
    include: {
      carta: {
        include: { habilidad: true, niveles: { orderBy: { nivel: 'asc' } } },
      },
    },
    orderBy: { obtenidaEn: 'desc' },
  });
}

async function clearDeck(usuarioId, client) {
  return withClient(client).usuarioCarta.updateMany({
    where: { usuarioId },
    data: { enMazo: false },
  });
}

async function setCardsInDeck(ids, client) {
  return withClient(client).usuarioCarta.updateMany({
    where: { id: { in: ids } },
    data: { enMazo: true },
  });
}

async function countDeck(usuarioId, client) {
  return withClient(client).usuarioCarta.count({
    where: { usuarioId, enMazo: true },
  });
}

module.exports = { findDeck, clearDeck, setCardsInDeck, countDeck };
