const events = require('../lib/events');
const { EVENTS } = events;
const cardService = require('./cardService');
const userRepository = require('../repositories/userRepository');

/**
 * Producto base. Define la interfaz común que la fábrica conoce:
 * un método `apply({ tx, usuarioId, ejercicio })` que siempre devuelve
 * `{ rewards, emittedEvents }`.
 *
 * La implementación base no aplica ningún efecto (comportamiento neutro),
 * lo que permite reutilizarla como punto de partida para los productos
 * concretos.
 */
class Reward {
  constructor(recompensa) {
    this.recompensa = recompensa;
  }

  // eslint-disable-next-line no-unused-vars
  async apply({ tx, usuarioId, ejercicio }) {
    return { rewards: [], emittedEvents: [] };
  }

  /**
   * Helper compartido por las recompensas que solo incrementan un campo
   * numérico del usuario (PUNTOS -> puntos, MONEDAS -> monedas).
   */
  async _applyIncrement({ tx, usuarioId, ejercicio, campo, tipo }) {
    const cantidad = this.recompensa.cantidad;

    await userRepository.updateById(usuarioId, { [campo]: { increment: cantidad } }, tx);

    const payload = { usuarioId, tipo, cantidad, ejercicioId: ejercicio.id };

    return {
      rewards: [{ tipo, cantidad }],
      emittedEvents: [{ name: EVENTS.REWARD_ASSIGNED, payload }],
    };
  }
}

/**
 * Recompensa concreta: incrementa los puntos del usuario.
 */
class PointsReward extends Reward {
  async apply({ tx, usuarioId, ejercicio }) {
    return this._applyIncrement({ tx, usuarioId, ejercicio, campo: 'puntos', tipo: 'PUNTOS' });
  }
}

/**
 * Recompensa concreta: incrementa las monedas del usuario.
 */
class CoinsReward extends Reward {
  async apply({ tx, usuarioId, ejercicio }) {
    return this._applyIncrement({ tx, usuarioId, ejercicio, campo: 'monedas', tipo: 'MONEDAS' });
  }
}

/**
 * Recompensa concreta: obtiene una carta aleatoria para el usuario.
 */
class CardReward extends Reward {
  async apply({ tx, usuarioId, ejercicio }) {
    const obtained = await cardService.obtainRandomCard(usuarioId, tx);

    if (!obtained.carta) {
      return { rewards: [], emittedEvents: [] };
    }

    return {
      rewards: [{ tipo: 'CARTA', carta: obtained.carta }],
      emittedEvents: [
        {
          name: EVENTS.CARD_OBTAINED,
          payload: {
            usuarioId,
            cartaId: obtained.carta.id,
            usuarioCartaId: obtained.usuarioCarta.id,
            ejercicioId: ejercicio.id,
          },
        },
        {
          name: EVENTS.REWARD_ASSIGNED,
          payload: { usuarioId, tipo: 'CARTA', cartaId: obtained.carta.id, ejercicioId: ejercicio.id },
        },
      ],
    };
  }
}

/**
 * Null Object: recompensa para tipos no soportados.
 * Aplica el comportamiento neutro heredado de Reward (no produce efectos
 * ni eventos), evitando que el servicio tenga que comprobar tipos no válidos.
 */
class NullReward extends Reward {
  constructor() {
    super(null);
  }
}

/**
 * Factory Method.
 * Decide qué clase de producto concreta instanciar según `recompensa.tipo`.
 * El cliente (rewardService) no necesita conocer las clases concretas.
 */
class RewardFactory {
  static create(recompensa) {
    switch (recompensa.tipo) {
      case 'PUNTOS':
        return new PointsReward(recompensa);
      case 'MONEDAS':
        return new CoinsReward(recompensa);
      case 'CARTA':
        return new CardReward(recompensa);
      default:
        return new NullReward();
    }
  }
}

module.exports = {
  Reward,
  PointsReward,
  CoinsReward,
  CardReward,
  NullReward,
  RewardFactory,
};
