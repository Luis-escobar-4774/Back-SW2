const userRepository = require('../repositories/userRepository');
const exerciseRepository = require('../repositories/exerciseRepository');
const cardService = require('./cardService');
const progressRepository = require('../repositories/progressRepository');
const prisma = require('../lib/prisma');

async function getDashboard(userId) {
  const user = await userRepository.selectPublicById(userId);
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.status = 404;
    throw error;
  }

  const [totalCartas, ejerciciosResueltos, mejorPuntaje, usuariosConMasPuntos] = await Promise.all([
    prisma.usuarioCarta.count({ where: { usuarioId: user.id } }),
    exerciseRepository.countSolved(user.id),
    prisma.user.aggregate({ _max: { puntos: true } }),
    userRepository.countWithMorePoints(user.puntos),
  ]);

  return {
    usuario: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    stats: {
      puntos: user.puntos,
      monedas: user.monedas,
      rachaEjercicios: user.rachaEjercicios,
      tiempoJugadoSeg: user.tiempoJugadoSeg,
      totalCartas,
      ejerciciosResueltos,
    },
    ranking: {
      posicion: usuariosConMasPuntos + 1,
      mejorPuntaje: mejorPuntaje._max.puntos ?? 0,
    },
  };
}

async function getRanking(limit = 10) {
  const top = await userRepository.topByPoints(limit);
  return {
    items: top.map((u, i) => ({ posicion: i + 1, ...u })),
    total: top.length,
  };
}

async function getInventory(userId) {
  const items = await cardService.listInventory(userId);
  return { items, total: items.length };
}

module.exports = { getDashboard, getRanking, getInventory };
