# Patrones de diseño en Back-SW2

> Documentación técnica de los patrones GoF aplicados en el backend de Cardly.
> Audiencia: desarrolladores que necesiten extender o mantener el servidor.

---

## Índice

1. [Patrones ya presentes](#1-patrones-ya-presentes)
2. [Decorator (Estructural) — rankingDecorators.js](#2-decorator-estructural--rankingdecoratorsjs)
3. [Cómo extender el Decorator](#3-cómo-extender-el-decorator)
4. [Próximo patrón recomendado — Strategy](#4-próximo-patrón-recomendado--strategy)

---

## 1. Patrones ya presentes

| Patrón | Dónde | Qué resuelve |
|---|---|---|
| **Singleton** | `src/lib/prisma.js`, `src/lib/events.js` | Una única instancia de PrismaClient y del EventEmitter para toda la app. |
| **Repository** | `src/repositories/*` | Abstrae las queries de Prisma detrás de métodos de dominio (`topByPoints`, `findByEmail`, etc.). Los servicios no saben de Prisma. |
| **Service Layer** | `src/services/*` | Orquesta repositorios y emite eventos; los controladores no tienen lógica de negocio. |
| **Observer** | `src/lib/events.js` + `src/services/rewardsListener.js` | Los servicios emiten eventos (`EXERCISE_COMPLETED`, `REWARD_ASSIGNED`, etc.) y los listeners reaccionan sin acoplamiento directo. |
| **Decorator nativo de Express** | `src/routes/*.js` | Cada `router.get('/ruta', requireAuth, validate(schema), controller)` es una cadena de decoradores: cada middleware añade comportamiento al handler sin modificarlo. |

---

## 2. Decorator (Estructural) — `rankingDecorators.js`

### Archivo

`src/services/rankingDecorators.js`

### Problema que resuelve

`GET /dashboard/ranking` es la query más pesada del back: agrupa y ordena todos los usuarios por puntos. Se llama en dos endpoints frecuentes:

- `GET /dashboard/ranking?limit=5` — cada vez que el Dashboard carga.
- `GET /dashboard/ranking?limit=50` — cada vez que la pantalla Ranking carga.

Sin caché, cada carga del Dashboard hace un `SELECT + ORDER BY puntos DESC` completo. El ranking solo cambia cuando un alumno resuelve un ejercicio (que es infrecuente comparado con las lecturas). Un caché de 30 s elimina la mayoría de esas queries.

### Contrato implícito (IRankingService)

```js
// Cualquier objeto que implemente este contrato puede entrar en la cadena:
// { getRanking(limit: number) → Promise<{ items: Array, total: number }> }
```

### Implementación

```js
class CachingRankingDecorator {
  constructor(wrapped, ttlMs = 30_000) {
    this.wrapped = wrapped;   // el siguiente eslabón (base o decorador)
    this.ttlMs = ttlMs;
    this._cache = new Map();  // key: String(limit) → { data, expiresAt }
  }

  async getRanking(limit = 10) {
    const key = String(limit);
    const cached = this._cache.get(key);

    // Sirve desde caché si aún está fresco
    if (cached && Date.now() < cached.expiresAt) return cached.data;

    // Llama al wrappee y guarda el resultado
    const data = await this.wrapped.getRanking(limit);
    this._cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
    return data;
  }

  invalidate() {
    this._cache.clear();
  }
}
```

### Composición y singleton

```js
// Se construye una sola vez al cargar el módulo
const rankingServiceCached = new CachingRankingDecorator(rankingService);

// Invalida el caché cuando alguien resuelve un ejercicio (puntaje cambia)
appEmitter.on(EVENTS.EXERCISE_COMPLETED, () => rankingServiceCached.invalidate());
```

### Flujo de una request a `GET /dashboard/ranking?limit=5`

```
dashboardController.ranking()
  → rankingServiceCached.getRanking(5)
      → ¿cache['5'] fresco? → SÍ → devuelve datos en memoria (0 ms, 0 queries)
                             → NO → rankingService.getRanking(5)
                                       → userRepository.topByPoints(5)
                                           → SELECT ... ORDER BY puntos DESC LIMIT 5
                                   → guarda en cache['5'] con expiresAt = ahora + 30s
                                   → devuelve datos
```

### Invalidación por evento

Cuando el back procesa un submit correcto, `exerciseService` emite `EXERCISE_COMPLETED`. El decorador escucha ese evento y llama a `invalidate()`, vaciando el `Map`. La siguiente request hará la query real y volverá a poblar el caché.

Esto garantiza que el ranking siempre esté actualizado al siguiente request después de un submit, sin esperar los 30 s del TTL.

### Claves separadas por `limit`

El caché guarda cada `limit` en una entrada distinta (`'5'` y `'50'` son entradas independientes). Así `limit=5` y `limit=50` no se invalidan mutuamente innecesariamente, pero `invalidate()` limpia ambas al recibir el evento (comportamiento conservador correcto: un submit cambia el ranking en todos los límites).

---

## 3. Cómo extender el Decorator

### Añadir un decorador de logging

```js
// src/services/rankingDecorators.js

class LoggingRankingDecorator {
  constructor(wrapped) { this.wrapped = wrapped; }

  async getRanking(limit) {
    const t0 = Date.now();
    const result = await this.wrapped.getRanking(limit);
    console.log(`[ranking] limit=${limit} → ${result.total} items en ${Date.now() - t0}ms`);
    return result;
  }
}
```

Para insertarlo en la cadena, cambia el singleton:

```js
const rankingServiceCached = new CachingRankingDecorator(
  new LoggingRankingDecorator(rankingService)
);
```

El controlador no cambia. La cadena queda:

```
CachingRankingDecorator → LoggingRankingDecorator → rankingService
```

### Ajustar el TTL en producción vs desarrollo

```js
const TTL = process.env.NODE_ENV === 'production' ? 60_000 : 5_000;
const rankingServiceCached = new CachingRankingDecorator(rankingService, TTL);
```

---

## 4. Próximo patrón recomendado — Strategy

El archivo `src/lib/validador.js` contiene dos estrategias de validación mezcladas con `if/else`:

```js
if (tipo === 'codigo') { /* normaliza y compara código fuente */ }
if (tipo === 'output') { /* compara salidas caso por caso */   }
```

El siguiente patrón natural es **Strategy**:

```
IValidationStrategy
  ├── CodigoValidationStrategy  → normaliza y compara contra solucionesCodigo[]
  └── OutputValidationStrategy  → compara stdout esperado vs recibido por caso
```

Ventaja: añadir soporte para un nuevo lenguaje (JavaScript, Java) o un nuevo modo de validación es una clase nueva, no un `else if` más.

Ver `CONTEXT.md` sección 6.5 para el roadmap completo de patrones del back.
