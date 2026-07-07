// Motor de la Partida 1v1 vs Bot (HU 9.J / 9.9 / 9.10 / 9.3).
//
// Fuente única de verdad de la mecánica: REGLAS_BATALLA.md (raíz del repo).
//
// Todo lo de este archivo son funciones PURAS: no tocan Prisma, no hacen I/O,
// no mutan sus argumentos (siempre clonan el estado antes de modificarlo).
// Esto permite testear la mecánica completa sin base de datos. La persistencia
// vive en partidaRepository/partidaService.

const SALUD_INICIAL = 30;
const MANA_INICIAL = 2;
const MANA_MAX_TOPE = 10;
const MANO_INICIAL = 4;

// Pool fijo de 12 cartas de combate — igual para jugador y bot (REGLAS_BATALLA.md §2).
// Tabla literal: no renombrar, no cambiar números.
const POOL_CARTAS = Object.freeze([
  { id: 1, nombre: 'Print Débil', rareza: 'COMUN', mana: 1, dano: 2, habTipo: 'dano', habVal: 0, habNombre: 'Golpe simple', glifo: '>>>' },
  { id: 2, nombre: 'Bucle For', rareza: 'COMUN', mana: 2, dano: 3, habTipo: 'dano', habVal: 0, habNombre: 'Iteración', glifo: 'for' },
  { id: 3, nombre: 'Try / Except', rareza: 'COMUN', mana: 2, dano: 0, habTipo: 'cura', habVal: 4, habNombre: 'Recuperación', glifo: 'try' },
  { id: 4, nombre: 'If / Else', rareza: 'RARA', mana: 3, dano: 4, habTipo: 'dano', habVal: 0, habNombre: 'Bifurcación', glifo: 'if' },
  { id: 5, nombre: 'While True', rareza: 'RARA', mana: 3, dano: 5, habTipo: 'dano', habVal: 0, habNombre: 'Ciclo infinito', glifo: '∞' },
  { id: 6, nombre: 'Lista Enlazada', rareza: 'RARA', mana: 3, dano: 0, habTipo: 'cura', habVal: 6, habNombre: 'Append vital', glifo: '[ ]' },
  { id: 7, nombre: 'Def Función', rareza: 'EPICA', mana: 4, dano: 6, habTipo: 'dano', habVal: 0, habNombre: 'Invocación', glifo: 'def' },
  { id: 8, nombre: 'Lambda', rareza: 'EPICA', mana: 4, dano: 5, habTipo: 'critico', habVal: 3, habNombre: 'Golpe anónimo', glifo: 'λ' },
  { id: 9, nombre: 'Decorador', rareza: 'EPICA', mana: 5, dano: 7, habTipo: 'dano', habVal: 0, habNombre: 'Envoltura', glifo: '@' },
  { id: 10, nombre: 'Dict Maestro', rareza: 'LEGENDARIA', mana: 5, dano: 4, habTipo: 'cura', habVal: 6, habNombre: 'Clave vital', glifo: '{ }' },
  { id: 11, nombre: 'Recursión', rareza: 'LEGENDARIA', mana: 6, dano: 9, habTipo: 'critico', habVal: 3, habNombre: 'Llamada profunda', glifo: 'f(f)' },
  { id: 12, nombre: 'Quicksort', rareza: 'LEGENDARIA', mana: 7, dano: 11, habTipo: 'dano', habVal: 0, habNombre: 'Orden absoluto', glifo: '⇅' },
]);

function crearError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Fisher-Yates. No muta `arr`; devuelve una copia barajada. */
function barajar(arr, rng = Math.random) {
  const copia = arr.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Aplica el efecto de una carta. Muta directamente `ejecutor`/`rival` (ya son
 * parte de un clon del estado hecho por el llamador — nunca el pool original). */
function aplicarEfectoCarta(carta, ejecutor, rival) {
  if (carta.habTipo === 'cura') {
    ejecutor.salud = Math.min(SALUD_INICIAL, ejecutor.salud + carta.habVal);
    return { dano: 0, curacion: carta.habVal };
  }
  const dano = carta.dano + (carta.habTipo === 'critico' ? carta.habVal : 0);
  rival.salud -= dano;
  return { dano, curacion: 0 };
}

/**
 * Crea el estado inicial de una partida nueva (REGLAS_BATALLA.md §3.1, pasos 1-2).
 * No persiste nada — eso lo hace partidaService al guardar el resultado.
 */
function crearEstadoInicial(rng = Math.random) {
  const barajaJugador = barajar(POOL_CARTAS, rng);
  const barajaBot = barajar(POOL_CARTAS, rng);

  const jugador = {
    salud: SALUD_INICIAL,
    mana: MANA_INICIAL,
    mano: barajaJugador.slice(0, MANO_INICIAL),
    mazo: barajaJugador.slice(MANO_INICIAL),
  };
  const bot = {
    salud: SALUD_INICIAL,
    mana: MANA_INICIAL,
    mano: barajaBot.slice(0, MANO_INICIAL),
    mazo: barajaBot.slice(MANO_INICIAL),
  };

  return {
    saludMax: SALUD_INICIAL,
    manaMax: MANA_INICIAL,
    ronda: 1,
    turno: 'usuario',
    resultado: null,
    jugador,
    bot,
    ultimaJugadaJugador: null,
    ultimaJugadaBot: null,
    log: ['Comienza la partida — tu turno. Maná 2/2.'],
  };
}

/** Turno del bot (REGLAS_BATALLA.md §3.2 puntos 1-4): roba, elige jugable al azar
 * entre las que puede pagar (RandomBotStrategy) o pasa. Muta el estado clonado. */
function ejecutarTurnoBot(estado, rng) {
  if (estado.bot.mazo.length > 0) {
    estado.bot.mano.push(estado.bot.mazo.shift());
  }

  const jugables = estado.bot.mano.filter((c) => c.mana <= estado.bot.mana);

  if (jugables.length === 0) {
    estado.ultimaJugadaBot = { paso: true };
    estado.log.push('El bot pasa el turno (sin maná suficiente).');
    return;
  }

  const elegida = jugables[Math.floor(rng() * jugables.length)];
  const idx = estado.bot.mano.findIndex((c) => c.id === elegida.id);
  const efecto = aplicarEfectoCarta(elegida, estado.bot, estado.jugador);
  estado.bot.mano.splice(idx, 1);
  estado.bot.mana -= elegida.mana;
  estado.ultimaJugadaBot = {
    paso: false,
    cartaId: elegida.id,
    nombre: elegida.nombre,
    habTipo: elegida.habTipo,
    dano: efecto.dano,
    curacion: efecto.curacion,
  };
  estado.log.push(`El bot jugó ${elegida.nombre}.`);
}

/** Cierra la ronda (REGLAS_BATALLA.md §3.2, tramo final): sube manaMax (tope 10),
 * resetea el maná de ambos al nuevo máximo (no acumulativo), el jugador roba 1. */
function cerrarRonda(estado) {
  estado.manaMax = Math.min(MANA_MAX_TOPE, estado.manaMax + 1);
  estado.jugador.mana = estado.manaMax;
  estado.bot.mana = estado.manaMax;

  if (estado.jugador.mazo.length > 0) {
    estado.jugador.mano.push(estado.jugador.mazo.shift());
  }

  estado.turno = 'usuario';
  estado.ronda += 1;
  estado.log.push(`Ronda ${estado.ronda} — tu turno. Maná ${estado.manaMax}/${estado.manaMax}.`);
}

function finalizar(estado, resultado) {
  estado.resultado = resultado;
  estado.log.push(resultado === 'VICTORIA' ? '¡Victoria! Ganaste 5 puntos.' : 'Derrota. El bot te venció.');
  return estado;
}

/**
 * Función pura central del motor: aplica un turno completo del usuario
 * (jugar una carta, o pasar) y, en la misma llamada, resuelve el turno del bot
 * y el cierre de ronda — tal como exige REGLAS_BATALLA.md §3.2/§3.3 (todo en
 * un solo request/response, sin segundo endpoint).
 *
 * @param {object} estadoActual - estado persistido (forma de REGLAS_BATALLA.md §4).
 * @param {number|null|undefined} cartaIdOPass - id de la carta a jugar, o
 *   null/undefined para pasar el turno.
 * @param {() => number} rng - inyectable para tests determinísticos (default Math.random).
 * @returns {object} nuevoEstado — nunca muta `estadoActual`.
 */
function aplicarTurno(estadoActual, cartaIdOPass, rng = Math.random) {
  if (estadoActual.resultado !== null) {
    throw crearError('La partida ya finalizó', 409);
  }
  if (estadoActual.turno !== 'usuario') {
    throw crearError('No es tu turno', 403);
  }

  const estado = structuredClone(estadoActual);
  const esPase = cartaIdOPass === null || cartaIdOPass === undefined;

  if (!esPase) {
    const idx = estado.jugador.mano.findIndex((c) => c.id === cartaIdOPass);
    if (idx === -1) {
      throw crearError('La carta no está en tu mano', 400);
    }
    const carta = estado.jugador.mano[idx];
    if (carta.mana > estado.jugador.mana) {
      throw crearError('Maná insuficiente para jugar esa carta', 400);
    }

    const efecto = aplicarEfectoCarta(carta, estado.jugador, estado.bot);
    estado.jugador.mano.splice(idx, 1);
    estado.jugador.mana -= carta.mana;
    estado.ultimaJugadaJugador = {
      paso: false,
      cartaId: carta.id,
      nombre: carta.nombre,
      habTipo: carta.habTipo,
      dano: efecto.dano,
      curacion: efecto.curacion,
    };
    estado.log.push(`Jugaste ${carta.nombre}.`);

    // Chequeo de victoria inmediato: el bot no juega su revancha (§3.2).
    if (estado.bot.salud <= 0) {
      return finalizar(estado, 'VICTORIA');
    }
  } else {
    estado.ultimaJugadaJugador = { paso: true };
    estado.log.push('Pasaste el turno (sin maná suficiente).');
  }

  ejecutarTurnoBot(estado, rng);

  if (estado.jugador.salud <= 0) {
    return finalizar(estado, 'DERROTA');
  }

  cerrarRonda(estado);
  return estado;
}

module.exports = {
  POOL_CARTAS,
  SALUD_INICIAL,
  MANA_INICIAL,
  MANA_MAX_TOPE,
  crearEstadoInicial,
  aplicarTurno,
};
