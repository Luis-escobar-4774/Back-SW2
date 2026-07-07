const prisma = require('../lib/prisma');
const events = require('../lib/events');
const { EVENTS } = events;
const partidaRepository = require('../repositories/partidaRepository');
const deckRepository = require('../repositories/deckRepository');
const userRepository = require('../repositories/userRepository');
const { crearEstadoInicial, aplicarTurno } = require('../lib/battleEngine');

const PUNTOS_VICTORIA = 5;
const MAZO_COMPLETO = 12;

function serializar(partida) {
  return {
    id: partida.id,
    resultado: partida.resultado,
    puntosGanados: partida.puntosGanados,
    estado: partida.estado,
  };
}

async function buscarPropia(usuarioId, partidaId) {
  const partida = await partidaRepository.findById(partidaId);
  if (!partida || partida.usuarioId !== usuarioId) {
    const err = new Error('Partida no encontrada');
    err.status = 404;
    throw err;
  }
  return partida;
}

/** POST /partida — valida mazo coleccionable completo (HU 9.4, ya existente) y crea la partida. */
async function iniciarPartida(usuarioId) {
  const cantidadEnMazo = await deckRepository.countDeck(usuarioId);
  if (cantidadEnMazo !== MAZO_COMPLETO) {
    const err = new Error('Necesitás tener tu mazo completo (12 cartas) para iniciar una partida');
    err.status = 400;
    throw err;
  }

  const estado = crearEstadoInicial();
  const partida = await partidaRepository.create({ usuarioId, ronda: estado.ronda, estado });
  return serializar(partida);
}

async function obtenerPartida(usuarioId, partidaId) {
  const partida = await buscarPropia(usuarioId, partidaId);
  return serializar(partida);
}

/** Persiste el nuevoEstado ya calculado por la función pura aplicarTurno,
 * incluyendo el otorgamiento de puntos (transacción atómica) en caso de VICTORIA. */
async function persistirResultado(usuarioId, partida, nuevoEstado) {
  if (nuevoEstado.resultado === 'VICTORIA') {
    const actualizada = await prisma.$transaction(async (tx) => {
      await userRepository.updateById(usuarioId, { puntos: { increment: PUNTOS_VICTORIA } }, tx);
      return partidaRepository.finalizar(partida.id, {
        resultado: 'VICTORIA',
        puntosGanados: PUNTOS_VICTORIA,
        estado: nuevoEstado,
        ronda: nuevoEstado.ronda,
      }, tx);
    });

    events.emit(EVENTS.GAME_WON, { usuarioId, partidaId: partida.id, puntosGanados: PUNTOS_VICTORIA });
    return serializar(actualizada);
  }

  if (nuevoEstado.resultado === 'DERROTA') {
    const actualizada = await partidaRepository.finalizar(partida.id, {
      resultado: 'DERROTA',
      estado: nuevoEstado,
      ronda: nuevoEstado.ronda,
    });
    return serializar(actualizada);
  }

  const actualizada = await partidaRepository.actualizarEstado(partida.id, nuevoEstado);
  return serializar(actualizada);
}

/** POST /partida/:id/jugar { cartaId } */
async function jugarCarta(usuarioId, partidaId, cartaId) {
  const partida = await buscarPropia(usuarioId, partidaId);
  const nuevoEstado = aplicarTurno(partida.estado, cartaId);
  return persistirResultado(usuarioId, partida, nuevoEstado);
}

/** POST /partida/:id/pasar */
async function pasarTurno(usuarioId, partidaId) {
  const partida = await buscarPropia(usuarioId, partidaId);
  const nuevoEstado = aplicarTurno(partida.estado, null);
  return persistirResultado(usuarioId, partida, nuevoEstado);
}

/** POST /partida/:id/abandonar — requiere confirmación en el frontend, no acá. */
async function abandonarPartida(usuarioId, partidaId) {
  const partida = await buscarPropia(usuarioId, partidaId);
  if (partida.resultado !== null) {
    const err = new Error('La partida ya finalizó');
    err.status = 409;
    throw err;
  }

  const estado = { ...partida.estado, resultado: 'ABANDONO' };
  const actualizada = await partidaRepository.finalizar(partida.id, {
    resultado: 'ABANDONO',
    estado,
    ronda: estado.ronda,
  });
  return serializar(actualizada);
}

module.exports = {
  iniciarPartida,
  obtenerPartida,
  jugarCarta,
  pasarTurno,
  abandonarPartida,
};
