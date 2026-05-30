const exerciseRepository = require('../repositories/exerciseRepository');
const userRepository = require('../repositories/userRepository');
const { RewardFactory } = require('./rewardFactory');

async function applyAttemptOutcome({ tx, usuarioId, ejercicio, correcto, tiempoResolucionSeg }) {
  const rewards = [];
  const emittedEvents = [];

  if (correcto) {
    await exerciseRepository.markResolved(usuarioId, ejercicio.id, tx);

    for (const recompensa of ejercicio.recompensas || []) {
      const prob = Number(recompensa.probabilidad);
      if (Math.random() > prob) continue;

      const reward = RewardFactory.create(recompensa);

      const applied = await reward.apply({
        tx,
        usuarioId,
        ejercicio,
      });

      rewards.push(...applied.rewards);
      emittedEvents.push(...applied.emittedEvents);
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
