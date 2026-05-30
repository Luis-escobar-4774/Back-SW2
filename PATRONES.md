# Patrones de diseño en Back-SW2

> Documentación técnica de los patrones GoF implementados en el backend de Cardly.
> Audiencia: desarrolladores que necesiten extender o mantener el servidor.

---

## Índice

1. [Resumen de patrones aplicados](#1-resumen-de-patrones-aplicados)
2. [Singleton — `src/lib/prisma.js` y `src/lib/events.js`](#2-singleton--srclibprismajs-y-srclibeventsjs)
3. [Repository — `src/repositories/*`](#3-repository--srcrepositories)
4. [Facade — `src/services/rewardsFacade.js`](#4-facade--srcservicesrewardsfacadejs)
5. [Observer — `src/lib/events.js` + `src/services/rewardsListener.js`](#5-observer--srclibeventsjs--srcservicesrewardslistenerjs)
6. [Decorator — `src/services/rankingDecorators.js`](#6-decorator--srcservicesrankingdecoratorsjs)
7. [Cómo interactúan los patrones en un submit](#7-cómo-interactúan-los-patrones-en-un-submit)
8. [Próximo patrón recomendado — Strategy](#8-próximo-patrón-recomendado--strategy)

---

## 1. Resumen de patrones aplicados

| Patrón | Categoría GoF | Archivo(s) | Qué resuelve |
|---|---|---|---|
| **Singleton** | Creacional | `src/lib/prisma.js`, `src/lib/events.js` | Una única instancia de PrismaClient y del EventEmitter para toda la app. |
| **Repository** | Estructural | `src/repositories/*` | Abstrae las queries de Prisma detrás de métodos de dominio; los servicios no saben de Prisma ni de SQL. |
| **Facade** | Estructural | `src/services/rewardsFacade.js` | Simplifica el acceso al subsistema de recompensas; el controlador solo llama `processResult()`. |
| **Observer** | Comportamiento | `src/lib/events.js` + `src/services/rewardsListener.js` | Desacopla el emisor de eventos (submit) de los consumidores (logs, notificaciones, analytics). |
| **Decorator** | Estructural | `src/services/rankingDecorators.js` | Añade caché con TTL e invalidación automática al servicio de ranking sin modificar su lógica base. |

---

## 2. Singleton — `src/lib/prisma.js` y `src/lib/events.js`

### Problema que resuelve

Node.js cachea los módulos en `require()`, pero con `--watch` (modo desarrollo con hot-reload) el módulo puede reinstanciarse en cada cambio de archivo. Sin el patrón Singleton:
- `PrismaClient` abriría un nuevo pool de conexiones en cada reload → agota conexiones en Supabase.
- `EventEmitter` sería una instancia distinta en cada módulo → los listeners registrados por un archivo no recibirían eventos emitidos por otro.

### Implementación en `prisma.js`

```js
const { PrismaClient } = require('@prisma/client');

const options = {
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
};

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(options);        // instancia directa en prod
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(options);  // primera vez: crea
  }
  prisma = global.__prisma;                  // todas las demás: reutiliza
}

module.exports = prisma;
```

**Por qué `global.__prisma`:** el objeto `global` de Node.js sobrevive a los re-evaluaciones de módulos durante el hot-reload. Es la única forma de mantener un singleton real en desarrollo sin sacrificar la capacidad de recarga.

### Implementación en `events.js`

```js
const EventEmitter = require('events');

class AppEmitter extends EventEmitter {}

const EVENTS = {
  EXERCISE_COMPLETED: 'exercise.completed',
  REWARD_ASSIGNED:    'reward.assigned',
  CARD_OBTAINED:      'card.obtained',
  LESSON_COMPLETED:   'lesson.completed',
};

let emitter;
if (process.env.NODE_ENV === 'production') {
  emitter = new AppEmitter();
} else {
  if (!global.__appEmitter) global.__appEmitter = new AppEmitter();
  emitter = global.__appEmitter;
}

module.exports = emitter;
module.exports.EVENTS = EVENTS;
```

El mismo truco `global.__appEmitter` garantiza que el bus de eventos sea único. Todos los módulos que hagan `require('../lib/events')` obtienen la misma instancia y, por tanto, comparten suscriptores y emisiones.

### Cómo extender

Para añadir un nuevo evento:

```js
// En events.js, dentro de EVENTS:
ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',

// En cualquier servicio:
appEmitter.emit(EVENTS.ACHIEVEMENT_UNLOCKED, { usuarioId, achievementId });

// En el listener que corresponda:
events.on(EVENTS.ACHIEVEMENT_UNLOCKED, (payload) => { /* ... */ });
```

---

## 3. Repository — `src/repositories/*`

### Archivos

- `exerciseRepository.js` — queries sobre `Ejercicio`, `EjercicioActivo`, `EjercicioResuelto`
- `userRepository.js` — queries sobre `User`
- `cardRepository.js` — queries sobre `Carta`, `UsuarioCarta`
- `moduleRepository.js` — queries sobre `Modulo`, `Paso`
- `progressRepository.js` — queries sobre `UsuarioPaso`

### Problema que resuelve

Sin repositories, los servicios importarían `prisma` directamente y mezclarían lógica de negocio con detalles de persistencia. Cambiar de ORM (o mockear en tests) requeriría editar cada servicio.

### Implementación — patrón `withClient`

```js
// userRepository.js
const prisma = require('../lib/prisma');

function withClient(client) {
  return client || prisma;   // usa el cliente de transacción si se pasa uno
}

async function topByPoints(limit, client) {
  return withClient(client).user.findMany({
    orderBy: [{ puntos: 'desc' }, { id: 'asc' }],
    take: limit,
    select: { id: true, username: true, puntos: true, rachaEjercicios: true, monedas: true },
  });
}

async function updateById(id, data, client) {
  return withClient(client).user.update({ where: { id }, data });
}
```

El parámetro opcional `client` permite que el repositorio participe en una **transacción de Prisma** sin necesitar inyección de dependencias formal:

```js
// En exerciseService — la transacción pasa el client a todos los repositorios
await prisma.$transaction(async (tx) => {
  await exerciseRepository.markResolved(usuarioId, ejercicioId, tx);
  await userRepository.updateById(usuarioId, { puntos: { increment: 10 } }, tx);
  await cardRepository.createUserCard(usuarioId, cartaId, tx);
  // Si cualquier línea falla, las tres hacen rollback automático
});
```

### Métodos por repositorio

**`exerciseRepository`**

| Método | Descripción |
|---|---|
| `list(where, client)` | Lista ejercicios con filtros dinámicos |
| `findById(id, client)` | Detalle con módulo y recompensas |
| `listActiveByUser(usuarioId, client)` | Top 5 pendientes del usuario |
| `upsertActive(usuarioId, ejercicioId, client)` | Asigna sin duplicar |
| `markResolved(usuarioId, ejercicioId, client)` | Cambia estado a RESUELTO |
| `createResolvedAttempt(data, client)` | Registra un intento en la bitácora |
| `countSolved(usuarioId, client)` | Total de ejercicios correctos |
| `listByModule(moduloId, client)` | Ejercicios de un módulo |

**`userRepository`**

| Método | Descripción |
|---|---|
| `create(data, client)` | Registra usuario nuevo |
| `findByEmail / findByUsername / findById` | Lookups únicos |
| `updateById(id, data, client)` | Actualiza campos arbitrarios (puntos, monedas, racha…) |
| `selectPublicById(id, client)` | Datos públicos sin password ni tokens |
| `countWithMorePoints(points, client)` | Para calcular posición en ranking |
| `topByPoints(limit, client)` | Top N global para el ranking |

### Cómo extender

Añadir un método nuevo es una función en el módulo del repositorio correspondiente:

```js
// exerciseRepository.js
async function countByDifficulty(dificultad, client) {
  return withClient(client).ejercicio.count({ where: { dificultad } });
}
module.exports = { /* ... existentes ... */, countByDifficulty };
```

Los servicios lo usan sin importar `prisma` directamente.

---

## 4. Facade — `src/services/rewardsFacade.js`

### Archivo

`src/services/rewardsFacade.js`

### Problema que resuelve

El subsistema de recompensas (`rewardService.js`) tiene una API interna compleja: recibe una transacción, el ejercicio, el estado de corrección, el tiempo, y retorna eventos a emitir. Exponer ese detalle al controlador lo acoplaría a la implementación interna.

La Facade publica una interfaz simplificada (`processResult`) que el controlador usa sin conocer el subsistema.

### Implementación

```js
// rewardsFacade.js
const rewardService = require('./rewardService');

async function processResult(input) {
  return rewardService.applyAttemptOutcome(input);
}

module.exports = { processResult };
```

### Uso en el flujo de submit

```
ejerciciosController.submit()
  → exerciseService.submitAttempt()
      → rewardsFacade.processResult({ tx, usuarioId, ejercicio, correcto, tiempoResolucionSeg })
          → rewardService.applyAttemptOutcome(...)
              → exerciseRepository.markResolved(...)      (dentro de tx)
              → userRepository.updateById(...)            (dentro de tx)
              → cardService.obtainRandomCard(...)         (dentro de tx)
          ← { usuario, rewards, emittedEvents }
      ← emite cada evento de emittedEvents
```

### Por qué la Facade aquí

Si mañana el subsistema de recompensas cambia (p.ej. se separa en microservicio, se añade cola de mensajes, o se divide en estrategias por tipo), solo cambia `rewardsFacade.js`. El controlador y el service no saben nada.

### Cómo extender

Para añadir validación previa a las recompensas (ej. verificar que el usuario no supere un tope de puntos diarios):

```js
async function processResult(input) {
  const { usuarioId } = input;
  const diario = await userRepository.puntosHoy(usuarioId);
  if (diario >= MAX_PUNTOS_DIA) {
    return rewardService.applyAttemptOutcomeWithoutPoints(input);
  }
  return rewardService.applyAttemptOutcome(input);
}
```

El controlador no cambia ni una línea.

---

## 5. Observer — `src/lib/events.js` + `src/services/rewardsListener.js`

### Problema que resuelve

Al resolver un ejercicio ocurren múltiples efectos secundarios: se actualiza el ranking, se pueden mandar notificaciones, se pueden actualizar analytics, se pueden desbloquear logros. Sin Observer, todo eso viviría en `submit` creando un monolito difícil de extender.

El patrón desacopla el **emisor** (quien resuelve el ejercicio) de los **suscriptores** (quienes reaccionan).

### Participantes

| Rol | Archivo | Descripción |
|---|---|---|
| **Bus de eventos** | `src/lib/events.js` | Singleton `AppEmitter extends EventEmitter`. Canal central de toda la app. |
| **Emisor** | `src/services/rewardService.js` | Colecta eventos en `emittedEvents[]` durante la transacción y los devuelve. |
| **Dispatcher** | `src/services/exerciseService.js` | Tras el commit de la transacción, llama `appEmitter.emit()` por cada evento colectado. |
| **Suscriptores** | `src/services/rewardsListener.js` | Registra handlers para los 4 eventos. Hoy loguea; en futuro: notificaciones, webhooks, achievements. |

### Flujo completo

```
exerciseService.submitAttempt()
  ├── prisma.$transaction(async (tx) => {
  │     rewardService.applyAttemptOutcome(...)
  │       // NO emite directamente — acumula en emittedEvents[]
  │       emittedEvents.push({ name: EVENTS.REWARD_ASSIGNED, payload: {...} })
  │       emittedEvents.push({ name: EVENTS.CARD_OBTAINED,   payload: {...} })
  │   }) ← transacción commiteada
  │
  └── for (const ev of result.emittedEvents) {
        appEmitter.emit(ev.name, ev.payload)    // AHORA sí se emite
      }
        ↓
  rewardsListener.js recibe cada evento y ejecuta sus handlers
```

**¿Por qué acumular y emitir después del commit?**
Si el emisor llamara `appEmitter.emit()` dentro de la transacción y ésta hiciera rollback, los listeners ya habrían ejecutado (log, notificación, etc.) sobre datos que no existen. Emitir después del commit garantiza consistencia.

### Implementación actual de `rewardsListener.js`

```js
const events = require('../lib/events');
const { EVENTS } = events;

events.on(EVENTS.EXERCISE_COMPLETED, (payload) => {
  console.log('[events] exercise.completed', {
    usuarioId: payload.usuarioId,
    ejercicioId: payload.ejercicioId,
    correcto: payload.correcto,
    tiempoResolucionSeg: payload.tiempoResolucionSeg,
  });
});

events.on(EVENTS.REWARD_ASSIGNED,  (payload) => { console.log('[events] reward.assigned',  payload); });
events.on(EVENTS.CARD_OBTAINED,    (payload) => { console.log('[events] card.obtained',    payload); });
events.on(EVENTS.LESSON_COMPLETED, (payload) => { console.log('[events] lesson.completed', payload); });
```

### Cómo extender — añadir un listener

Sin tocar ningún archivo existente:

```js
// src/services/achievementsListener.js  (archivo nuevo)
const events = require('../lib/events');
const { EVENTS } = events;

events.on(EVENTS.EXERCISE_COMPLETED, async (payload) => {
  if (payload.correcto) {
    await achievementService.checkAndUnlock(payload.usuarioId);
  }
});
```

Y registrarlo en `src/index.js`:

```js
require('./services/achievementsListener');
```

El emisor (`exerciseService`) no sabe que existe este listener. El ranking decorator tampoco. Cada suscriptor es independiente.

---

## 6. Decorator — `src/services/rankingDecorators.js`

### Problema que resuelve

`GET /dashboard/ranking` hace un `SELECT + ORDER BY puntos DESC` sobre toda la tabla de usuarios en cada carga del Dashboard y del Ranking. El ranking cambia solo cuando alguien resuelve un ejercicio (evento frecuente pero mucho menos que las lecturas). Sin caché, cada visita al Dashboard genera una query innecesaria.

### Contrato implícito (`IRankingService`)

```js
// Cualquier objeto con este método puede entrar en la cadena de decoradores:
// { getRanking(limit: number) → Promise<{ items: Array, total: number }> }
```

### Implementación — `CachingRankingDecorator`

```js
class CachingRankingDecorator {
  constructor(wrapped, ttlMs = 30_000) {
    this.wrapped = wrapped;      // siguiente eslabón de la cadena
    this.ttlMs   = ttlMs;
    this._cache  = new Map();   // key: String(limit) → { data, expiresAt }
  }

  async getRanking(limit = 10) {
    const key    = String(limit);
    const cached = this._cache.get(key);

    if (cached && Date.now() < cached.expiresAt) return cached.data;

    const data = await this.wrapped.getRanking(limit);
    this._cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
    return data;
  }

  invalidate() { this._cache.clear(); }
}
```

### Composición y conexión con el Observer

```js
const rankingServiceCached = new CachingRankingDecorator(rankingService);

// El Decorator se conecta al bus de eventos del patrón Observer:
// cada vez que se resuelve un ejercicio, el caché se invalida automáticamente.
appEmitter.on(EVENTS.EXERCISE_COMPLETED, () => rankingServiceCached.invalidate());
```

### Flujo de una request a `GET /dashboard/ranking?limit=5`

```
dashboardController.ranking()
  → rankingServiceCached.getRanking(5)
      → cache['5'] fresco?  → SÍ → devuelve desde memoria  (0 ms · 0 queries)
                            → NO → rankingService.getRanking(5)
                                     → userRepository.topByPoints(5) → Prisma → BD
                                   → guarda en cache['5'] con TTL 30 s
                                   → devuelve datos frescos
```

### Cómo extender

```js
// Añadir LoggingRankingDecorator y encadenarlo:
class LoggingRankingDecorator {
  constructor(wrapped) { this.wrapped = wrapped; }
  async getRanking(limit) {
    const t0 = Date.now();
    const result = await this.wrapped.getRanking(limit);
    console.log(`[ranking] limit=${limit} → ${Date.now() - t0}ms`);
    return result;
  }
}

const rankingServiceCached = new CachingRankingDecorator(
  new LoggingRankingDecorator(rankingService)
);
// dashboardController no cambia.
```

---

## 7. Cómo interactúan los patrones en un submit

El flujo de `POST /ejercicios/:id/submit` es donde todos los patrones convergen:

```
HTTP request
│
├─ requireAuth (middleware — Chain of Responsibility de Express)
├─ validate(submitSchema) (middleware — Zod)
│
└─ ejerciciosController.submit()
     │
     ├─ exerciseService.submitAttempt(userId, ejId, body)
     │    │
     │    ├─ exerciseRepository.findByIdWithRewards(ejId)   [Repository]
     │    │    └─ prisma.ejercicio.findUnique(...)           [Singleton]
     │    │
     │    ├─ validador.validar(respuesta, ejercicio)
     │    │
     │    └─ prisma.$transaction(async (tx) => {            [Singleton]
     │         rewardsFacade.processResult({tx,...})         [Facade]
     │           └─ rewardService.applyAttemptOutcome(...)
     │                ├─ exerciseRepository.markResolved(tx) [Repository]
     │                ├─ userRepository.updateById(tx)       [Repository]
     │                └─ cardService.obtainRandomCard(tx)    [Repository interno]
     │         }) ← commit
     │
     └─ for ev of emittedEvents → appEmitter.emit(ev)       [Observer]
          ├─ rewardsListener: console.log(...)
          └─ rankingDecorators: rankingServiceCached.invalidate()  [Decorator]
```

**El Decorator (invalidación del caché) reacciona a través del Observer.** Ninguno de los dos sabe del otro directamente — el bus de eventos es el único punto de conexión.

---

## 8. Próximo patrón recomendado — Strategy

El archivo `src/lib/validador.js` tiene dos estrategias de validación unidas con `if/else`:

```js
if (tipo === 'codigo') { /* normaliza y compara código fuente */ }
if (tipo === 'output') { /* compara salidas caso por caso */    }
```

El siguiente patrón prioritario es **Strategy**:

```
IValidationStrategy
  ├── CodigoValidationStrategy   → normaliza y compara contra solucionesCodigo[]
  └── OutputValidationStrategy   → compara stdout esperado vs recibido por caso
```

Beneficio: añadir `ValidadorJudge0` (que manda el código a un juez externo) o `ValidadorPseudocodigo` es una clase nueva, no un `else if` más. Ver `CONTEXT.md` §6 para el roadmap completo.
