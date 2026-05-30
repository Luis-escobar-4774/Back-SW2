const prisma = require('../lib/prisma');

function withClient(client) {
  return client || prisma;
}

async function count(client) {
  return withClient(client).carta.count();
}

async function findRandom(client) {
  const tx = withClient(client);
  const total = await tx.carta.count();
  if (total === 0) return null;
  const skip = Math.floor(Math.random() * total);
  return tx.carta.findFirst({ skip, orderBy: { id: 'asc' } });
}

async function createUserCard(usuarioId, cartaId, client) {
  return withClient(client).usuarioCarta.create({
    data: { usuarioId, cartaId },
    include: { carta: true },
  });
}

async function listInventory(usuarioId, client) {
  return withClient(client).usuarioCarta.findMany({
    where: { usuarioId },
    include: {
      carta: {
        include: { habilidad: true, niveles: { orderBy: { nivel: 'asc' } } },
      },
    },
    orderBy: { obtenidaEn: 'desc' },
  });
}

module.exports = {
  count,
  findRandom,
  createUserCard,
  listInventory,
};
