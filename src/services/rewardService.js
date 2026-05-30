const events = require('../lib/events');
const { EVENTS } = events;
const cardService = require('./cardService');
const exerciseRepository = require('../repositories/exerciseRepository');
const userRepository = require('../repositories/userRepository');

function rewardToPublic(reward) {
  if (reward.tipo === 'CARTA') {
    return { tipo: 'CARTA', carta: reward.carta };
  }
  return { tipo: reward.tipo, cantidad: reward.cantidad };
}

async function applyAttemptOutcome({ tx, usuarioId, ejercicio, correcto, tiempoResolucionSeg }) {
  const rewards = [];
  const emittedEvents = [];

  if (correcto) {
    await exerciseRepository.markResolved(usuarioId, ejercicio.id, tx);

    for (const recompensa of ejercicio.recompensas || []) {
      const prob = Number(recompensa.probabilidad);
      if (Math.random() > prob) continue;

      if (recompensa.tipo === 'PUNTOS') {
        await userRepository.updateById(usuarioId, { puntos: { increment: recompensa.cantidad } }, tx);
        const payload = { usuarioId, tipo: 'PUNTOS', cantidad: recompensa.cantidad, ejercicioId: ejercicio.id };
        rewards.push(rewardToPublic({ tipo: 'PUNTOS', cantidad: recompensa.cantidad }));
        emittedEvents.push({ name: EVENTS.REWARD_ASSIGNED, payload });
        continue;
      }

      if (recompensa.tipo === 'MONEDAS') {
        await userRepository.updateById(usuarioId, { monedas: { increment: recompensa.cantidad } }, tx);
        const payload = { usuarioId, tipo: 'MONEDAS', cantidad: recompensa.cantidad, ejercicioId: ejercicio.id };
        rewards.push(rewardToPublic({ tipo: 'MONEDAS', cantidad: recompensa.cantidad }));
        emittedEvents.push({ name: EVENTS.REWARD_ASSIGNED, payload });
        continue;
      }

      if (recompensa.tipo === 'CARTA') {
        const obtained = await cardService.obtainRandomCard(usuarioId, tx);
        if (obtained.carta) {
          rewards.push({ tipo: 'CARTA', carta: obtained.carta });
          emittedEvents.push({
            name: EVENTS.CARD_OBTAINED,
            payload: {
              usuarioId,
              cartaId: obtained.carta.id,
              usuarioCartaId: obtained.usuarioCarta.id,
              ejercicioId: ejercicio.id,
            },
          });
          emittedEvents.push({
            name: EVENTS.REWARD_ASSIGNED,
            payload: { usuarioId, tipo: 'CARTA', cartaId: obtained.carta.id, ejercicioId: ejercicio.id },
          });
        }
      }
    }

    await userRepository.updateById(usuarioId, {
      rachaEjercicios: { increment: 1 },
      tiempoJugadoSeg: { increment: tiempoResolucionSeg },
    }, tx);
  } else {
    await userRepository.updateById(usuarioId, {
      rachaEjercicios: 0,
      tiempoJugadoSeg: { increment: tiempoResolucionSeg },
    }, tx);
  }

  const usuario = await userRepository.findById(usuarioId, tx);
  return { usuario, rewards, emittedEvents };
}

module.exports = { applyAttemptOutcome };
