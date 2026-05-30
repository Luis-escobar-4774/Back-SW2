# Back-SW2 — Contexto del Proyecto

Backend del videojuego web educativo **Cardly** (proyecto de Software 2). Plataforma de aprendizaje de programacion con sistema de cartas coleccionables, ejercicios verificables, modulos teoricos y gamificacion (puntos, racha, ranking).

> **Decision de alcance:** se descarta toda integracion con GitHub (auth, webhooks, repos). El backend es 100% autocontenido: el alumno envia su respuesta (codigo u output) y el backend la valida contra soluciones predefinidas almacenadas en BD.

---

## 1. Stack

| Capa | Tecnologia |
|---|---|
| Runtime | Node.js v24 |
| HTTP | Express 5 |
| ORM | Prisma 6 |
| BD | PostgreSQL (Supabase, via pooler) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validacion | Zod |
| Middleware | helmet, cors, morgan |

---

## 2. Como correrlo localmente

```bash
# 1. Instalar dependencias
npm install

# 2. Crear .env (ver .env.example)
#    DATABASE_URL = pooler de Supabase
#    JWT_SECRET   = string aleatorio largo

# 3. Sincronizar schema con la BD
npx prisma db push

# 4. Cargar datos demo (modulos, ejercicios, cartas)
npm run seed

# 5. Levantar el servidor
npm run dev      # con --watch (recarga al guardar)
npm start        # produccion-like
```

Verificar: `GET http://localhost:3000/health` debe devolver `{ "status": "ok", "db": "up" }`.

---

## 3. Estructura

```
Back-SW2/
├── prisma/
│   ├── schema.prisma            # 13 modelos, 4 enums
│   └── seed.js                  # Datos demo (módulos, ejercicios, cartas)
│
├── src/
│   ├── index.js                 # Bootstrap Express, monta rutas
│   │
│   ├── lib/
│   │   ├── prisma.js            # PrismaClient Singleton (safe para hot-reload)
│   │   ├── events.js            # AppEmitter Singleton + catálogo de EVENTS
│   │   ├── auth.js              # hash/verify password · sign/verify JWT
│   │   └── validador.js         # Lógica de validación de respuestas (tipo código/output)
│   │
│   ├── middleware/
│   │   ├── requireAuth.js       # Verifica Bearer token → 401 si falta
│   │   └── optionalAuth.js      # Autentica si hay token, continúa si no
│   │
│   ├── routes/
│   │   ├── auth.js              # /auth/*
│   │   ├── ejercicios.js        # /ejercicios/*
│   │   ├── dashboard.js         # /dashboard/*
│   │   ├── modulos.js           # /modulos/*
│   │   └── pasos.js             # /pasos/*
│   │
│   ├── controllers/
│   │   ├── authController.js        # register, login, me
│   │   ├── ejerciciosController.js  # list, activos, asignar, detalle, submit
│   │   ├── dashboardController.js   # index, ranking (usa CachingRankingDecorator)
│   │   ├── modulosController.js     # list, detalle, ejercicios
│   │   └── pasosController.js       # completar, descompletar
│   │
│   ├── services/
│   │   ├── authService.js           # register, login, me
│   │   ├── exerciseService.js       # listExercises, listActive, asignar, submit (orquesta todo)
│   │   ├── rewardService.js         # applyAttemptOutcome — lógica de recompensas en transacción
│   │   ├── rewardsFacade.js         # Facade: simplifica acceso a rewardService
│   │   ├── rewardsListener.js       # Observer: suscriptores del bus de eventos
│   │   ├── rankingDecorators.js     # Decorator: CachingRankingDecorator + createDefaultRanking
│   │   ├── cardService.js           # obtainRandomCard, listInventory
│   │   ├── dashboardService.js      # getDashboard, getInventory
│   │   ├── rankingService.js        # getRanking (implementación base)
│   │   ├── learningModuleService.js # listModules, getModule, getModuleExercises
│   │   └── userProgressService.js   # completeStep, uncompleteStep
│   │
│   ├── repositories/
│   │   ├── exerciseRepository.js    # Queries sobre Ejercicio, EjercicioActivo, EjercicioResuelto
│   │   ├── userRepository.js        # Queries sobre User
│   │   ├── cardRepository.js        # Queries sobre Carta, UsuarioCarta
│   │   ├── moduleRepository.js      # Queries sobre Modulo, Paso
│   │   └── progressRepository.js    # Queries sobre UsuarioPaso
│   │
│   └── validators/
│       ├── auth.validator.js        # Zod: registerSchema, loginSchema
│       └── exercise.validator.js    # Zod: assignSchema, submitSchema
│
├── .env                    # NO commitear — ver .env.example
├── .env.example
├── package.json
├── CONTEXT.md              # Este archivo
└── PATRONES.md             # Documentación detallada de patrones de diseño
```

---

## 4. Modelo de datos (resumen)

13 tablas en Postgres (snake_case en BD, camelCase en Prisma):

| Tabla | Proposito |
|---|---|
| `users` | Usuarios con rol (ALUMNO/PROFESOR/ADMIN), puntos, monedas, racha |
| `ejercicios` | Catalogo de ejercicios: titulo, descripcion, casos_prueba (JSON), soluciones_codigo (JSON), modulo |
| `ejercicios_activos` | Asignaciones usuario↔ejercicio con estado PENDIENTE / RESUELTO |
| `ejercicios_resueltos` | Bitacora de cada intento (correcto o no) con tiempo y respuesta |
| `recompensas` | Reglas de drop por ejercicio: PUNTOS / MONEDAS / CARTA con probabilidad |
| `cartas` | Template de carta (Mago, Dragon, ...) con rareza y habilidad |
| `cartas_niveles` | Stats por nivel de una carta (dano, salud, mana) |
| `habilidades` | Catalogo de habilidades |
| `usuario_cartas` | Instancia de carta poseida por un usuario |
| `modulos` | Modulos educativos (orden secuencial) |
| `pasos` | Pasos dentro de un modulo (orden secuencial) |
| `usuario_pasos` | Progreso por usuario de cada paso |

**Enums:** `Rol`, `EstadoEjercicio`, `TipoRecompensa`, `Rareza`.

---

## 5. Endpoints implementados (Sprint 1)

### Auth
- `POST /auth/register` — `{ email, username, password }` → `{ user, token }`
- `POST /auth/login` — `{ email, password }` → `{ user, token }`
- `GET /auth/me` — devuelve el usuario actual

### Ejercicios
- `GET /ejercicios` — lista. Filtros `?moduloId=&dificultad=&lenguaje=`
- `GET /ejercicios/:id` — detalle (sin spoilear soluciones)
- `GET /ejercicios/activos` — pendientes del usuario (top 5)
- `POST /ejercicios/activos` — asignar `{ ejercicioId }`
- `POST /ejercicios/:id/submit` — enviar `{ tipo: 'codigo'|'output', respuesta, tiempoResolucionSeg }`. Valida, otorga puntos y carta aleatoria, actualiza racha.

### Dashboard
- `GET /dashboard` — puntos, totalCartas, posicion en ranking, racha, ejerciciosResueltos
- `GET /dashboard/ranking` — top global, `?limit=10`
- `GET /dashboard/mis-cartas` — inventario del usuario

### Modulos / Pasos
- `GET /modulos` — lista (incluye progreso si hay token)
- `GET /modulos/:id` — detalle con pasos y completado por paso (si hay token)
- `GET /modulos/:id/ejercicios` — ejercicios del modulo
- `POST /pasos/:id/completar` — marca paso completado
- `DELETE /pasos/:id/completar` — desmarca

### Logica de validacion
- **Tipo `codigo`**: compara la respuesta contra `soluciones_codigo` del ejercicio normalizando espacios, saltos de linea y comentarios (`#`, `//`).
- **Tipo `output`**: si es array, exige misma cantidad de outputs que casos de prueba y compara uno a uno; si es string, busca match contra cualquier output esperado.
- Si correcto → marca asignacion RESUELTO, otorga recompensas (segun probabilidad), incrementa puntos / monedas / racha en transaccion.
- Si incorrecto → guarda el intento, rompe racha (racha = 0).

---

## 6. Ingenieria de Software 2 — SOLID + Patrones

> Para documentacion detallada con codigo de cada patron, ver **`PATRONES.md`**.

### 6.1 SOLID — estado actual

| Principio | Estado | Notas |
|---|---|---|
| **S — Single Responsibility** | ✅ Aplicado | Capas separadas: Routes (HTTP) → Controllers (request/response) → Services (negocio) → Repositories (BD). Cada archivo tiene una sola razon para cambiar. |
| **O — Open/Closed** | ⚠️ Parcial | Repositories y Services son extensibles sin modificar. `validador.js` todavia usa `if/else` por tipo — pendiente migrar a **Strategy** (ver §6.4). |
| **L — Liskov Substitution** | ⚠️ Pendiente | Aplica cuando se introduzcan jerarquias (Recompensa → RecompensaPuntos, RecompensaCarta). Disenar con firma comun `otorgar(usuario, tx)`. |
| **I — Interface Segregation** | ⚠️ Pendiente | JS no tiene interfaces nativas. El patron Repository + `withClient` ya las simula. Si se migra a TS: definir `IRepository<T>`, `IValidador`, etc. |
| **D — Dependency Inversion** | ✅ Aplicado | Services reciben repositories; controllers reciben services. Repositories reciben el cliente Prisma opcionalmente (permite transacciones y mocks). |

### 6.2 Patrones aplicados

| Patron | Categoria | Archivo | Estado |
|---|---|---|---|
| **Singleton** | Creacional | `src/lib/prisma.js`, `src/lib/events.js` | ✅ Aplicado |
| **Repository** | Estructural | `src/repositories/*` | ✅ Aplicado |
| **Facade** | Estructural | `src/services/rewardsFacade.js` | ✅ Aplicado |
| **Observer** | Comportamiento | `src/lib/events.js` + `src/services/rewardsListener.js` | ✅ Aplicado |
| **Decorator** | Estructural | `src/services/rankingDecorators.js` | ✅ Aplicado |
| **Chain of Responsibility** | Comportamiento | `src/middleware/requireAuth.js`, `optionalAuth.js` | ✅ Nativo de Express |

### 6.3 Patrones pendientes (roadmap)

| Patron | Prioridad | Donde aplicar |
|---|---|---|
| **Strategy** | Alta | `src/lib/validador.js` — extraer `ValidadorCodigo` y `ValidadorOutput` a clases con metodo comun `validar(respuesta, ejercicio)`. Agregar nuevos tipos sin tocar el switch. |
| **Factory Method** | Media | `rewardService.js` — `RecompensaFactory.crear(tipo)` que devuelva `RecompensaPuntos`, `RecompensaMonedas`, `RecompensaCarta`. Elimina el `if/if/if` actual. |
| **Template Method** | Media | Para los `Validador*` futuros: clase base `ValidadorBase` con hooks `normalizar()` y `comparar()` que las subclases implementan. |
| **State** | Baja | `EjercicioActivo` PENDIENTE → RESUELTO. Modelarlo como State machine facilita agregar estados futuros (EN_REVISION, VENCIDO). |
| **Command** | Baja | Acciones del alumno (asignar, enviar, completar paso) como objetos Command con `execute()` — facilita auditoria y undo. |
| **Abstract Factory** | Baja | Si hay familias de lenguajes: `ValidadorPython`, `ValidadorJava` con sus propios normalizadores y reglas. |

### 6.4 Descripcion rapida de los patrones aplicados

**Singleton (`prisma.js` + `events.js`):** garantiza una unica instancia de PrismaClient (evita agotar el pool de conexiones de Supabase) y una unica instancia del EventEmitter (todos los modulos escuchan el mismo bus). Usa el truco `global.__prisma` / `global.__appEmitter` para sobrevivir al hot-reload de `--watch`.

**Repository (`repositories/*`):** abstrae las queries de Prisma detras de metodos de dominio (`topByPoints`, `markResolved`, `findByEmail`). Los servicios nunca importan `prisma` directamente. El parametro opcional `client` permite que los repositorios participen en transacciones `prisma.$transaction(tx)` sin cambiar su firma.

**Facade (`rewardsFacade.js`):** expone `processResult(input)` como punto unico de acceso al subsistema de recompensas. El controlador no sabe que internamente existen `rewardService`, `cardService` y repositorios coordinandose dentro de una transaccion.

**Observer (`events.js` + `rewardsListener.js`):** el bus de eventos desacopla el submit del ejercicio de todos sus efectos secundarios. `rewardService` acumula eventos en un array durante la transaccion y los emite DESPUES del commit para evitar side-effects sobre datos que podrian hacer rollback. Agregar un listener nuevo (achievements, notificaciones) = un archivo nuevo + una linea en `index.js`.

**Decorator (`rankingDecorators.js`):** `CachingRankingDecorator` envuelve `rankingService` con cache en memoria (TTL 30s). Se conecta al Observer: cuando se emite `EXERCISE_COMPLETED`, llama a `invalidate()` automaticamente. El controlador solo llama `getRanking(limit)` — no sabe si el resultado viene de cache o de BD.

---

## 7. Que falta (pendientes)

### Funcionalidad
- [ ] **Aulas / Profesores / Asignaciones** — las HU mencionan que profesores creen grupos y asignen ejercicios. Tablas y endpoints sin implementar.
- [ ] **Endpoints CRUD para administracion** — hoy ejercicios, modulos y cartas solo se crean via seed. Falta `POST/PUT/DELETE` con permisos de rol (ADMIN/PROFESOR).
- [ ] **Notificaciones de actualizacion del sistema** (HU mencionada en sec. 2.3 de la propuesta).
- [ ] **Sistema de combate / multijugador** — fuera de Sprint 1.
- [ ] **Foros por modulo** — el campo `id_foro` aparecio en el SQL original pero se descarto del schema actual.

### Calidad / Ingenieria
- [ ] **Refactor SW2** segun la seccion 6.5 (capas service/repository, Strategy, Factory, Observer).
- [ ] **Tests** — ni unitarios ni de integracion. Sugerido: Jest + Supertest.
- [ ] **Migraciones formales** — hoy se usa `prisma db push`. Para produccion conviene `prisma migrate dev` + carpeta `migrations/`.
- [ ] **OpenAPI / Swagger** — documentacion auto-generada de los endpoints.
- [ ] **Logger estructurado** — hoy solo `morgan` y `console.log`. Cambiar a `pino` con niveles.
- [ ] **Rate limiting** en `/auth/*` para evitar brute force.
- [ ] **Validacion mas estricta** del input en submit (largo maximo, sanitizacion).

### Seguridad (URGENTE)
- [ ] **Rotar password de Supabase** — estuvo expuesta en el repo en commits anteriores.
- [ ] **`JWT_SECRET` actual es placeholder** — reemplazar por uno aleatorio largo antes de deploy.
- [ ] **Configurar CORS** restrictivamente (hoy esta abierto a todos los origenes).
- [ ] **HTTPS en deploy** — obligatorio para JWT en produccion.

---

## 8. Datos demo cargados (despues de `npm run seed`)

- 5 **habilidades**: Bola de Fuego, Escudo Arcano, Curacion, Rayo Helado, Golpe Critico
- 8 **cartas** con 3 niveles cada una (COMUN → LEGENDARIA)
- 3 **modulos** con un total de 9 pasos
- 5 **ejercicios** en Python (FACIL y MEDIO) con casos de prueba y soluciones aceptadas

Para empezar a probar:
```bash
# Registrar
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"test","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Listar ejercicios (sin auth)
curl http://localhost:3000/ejercicios
```

---

## 9. Notas para el equipo

- **No commitear `.env`** — esta en `.gitignore`. Usar `.env.example` como referencia.
- **Para cambios de schema:** editar `prisma/schema.prisma` → `npx prisma db push` (dev) o `npx prisma migrate dev --name <nombre>` (cuando se formalice).
- **Para regenerar el cliente Prisma** despues de cambios: `npx prisma generate`.
- **Para abrir Prisma Studio** (GUI de la BD): `npm run prisma:studio`.
- **La BD esta compartida** (Supabase). Cualquier cambio destructivo (`db push --force-reset`) afecta a todo el equipo — coordinar antes.
