const prisma = require('../lib/prisma');

function withClient(client) {
  return client || prisma;
}

async function create(data, client) {
  return withClient(client).user.create({ data });
}

async function findByEmail(email, client) {
  return withClient(client).user.findUnique({ where: { email } });
}

async function findByUsername(username, client) {
  return withClient(client).user.findUnique({ where: { username } });
}

async function findById(id, client) {
  return withClient(client).user.findUnique({ where: { id } });
}

async function updateById(id, data, client) {
  return withClient(client).user.update({ where: { id }, data });
}

async function selectPublicById(id, client) {
  return withClient(client).user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      rol: true,
      puntos: true,
      monedas: true,
      rachaEjercicios: true,
      tiempoJugadoSeg: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function countWithMorePoints(points, client) {
  return withClient(client).user.count({ where: { puntos: { gt: points } } });
}

async function topByPoints(limit, client) {
  return withClient(client).user.findMany({
    orderBy: [{ puntos: 'desc' }, { id: 'asc' }],
    take: limit,
    select: {
      id: true,
      username: true,
      puntos: true,
      rachaEjercicios: true,
      monedas: true,
    },
  });
}

module.exports = {
  create,
  findByEmail,
  findByUsername,
  findById,
  updateById,
  selectPublicById,
  countWithMorePoints,
  topByPoints,
};
