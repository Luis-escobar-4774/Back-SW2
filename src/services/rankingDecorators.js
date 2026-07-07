// Patrón Decorator (Estructural) sobre el servicio de ranking.
//
// Contrato IRankingService (implícito, JS):
//   { getRanking(limit: number) → Promise<{ items, total }> }
//
// Cadena actual:
//   CachingRankingDecorator → rankingService (base)
//
// Para añadir un decorador nuevo (ej. LoggingRankingDecorator):
//   rankingServiceCached = new CachingRankingDecorator(
//     new LoggingRankingDecorator(rankingService)
//   );

const rankingService = require('./rankingService');
const appEmitter = require('../lib/events');
const { EVENTS } = require('../lib/events');

const CACHE_TTL_MS = 30_000; // 30 s — el ranking cambia solo en cada submit

// ── Decorador: caché en memoria con TTL ──────────────────────────────────────

class CachingRankingDecorator {
  /**
   * @param {object} wrapped  - Cualquier objeto con método getRanking(limit)
   * @param {number} ttlMs    - Tiempo de vida del caché en milisegundos
   */
  constructor(wrapped, ttlMs = CACHE_TTL_MS) {
    this.wrapped = wrapped;
    this.ttlMs = ttlMs;
    /** @type {Map<string, { data: object, expiresAt: number }>} */
    this._cache = new Map();
  }

  async getRanking(limit = 10) {
    const key = String(limit);
    const cached = this._cache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const data = await this.wrapped.getRanking(limit);
    this._cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
    return data;
  }

  /** Limpia todas las entradas del caché (se llama al resolver un ejercicio). */
  invalidate() {
    this._cache.clear();
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
// Se construye una vez al cargar el módulo. Todos los controladores que importen
// rankingServiceCached comparten la misma instancia y el mismo caché en memoria.

const rankingServiceCached = new CachingRankingDecorator(rankingService);

// Invalida el caché cuando cualquier alumno resuelve un ejercicio, garantizando
// que la próxima consulta al ranking refleje el cambio de puntos.
appEmitter.on(EVENTS.EXERCISE_COMPLETED, () => {
  rankingServiceCached.invalidate();
});

// Ganar una partida de batalla también otorga puntos (+5) — mismo patrón de
// invalidación que EXERCISE_COMPLETED (REGLAS_BATALLA.md §3.4).
appEmitter.on(EVENTS.GAME_WON, () => {
  rankingServiceCached.invalidate();
});

module.exports = { rankingServiceCached, CachingRankingDecorator };
