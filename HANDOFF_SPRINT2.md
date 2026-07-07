# Handoff Sprint 2 — Cardly (arquitectura, cambios y cómo correrlo)

> Leer esto antes de tocar cualquier archivo de Sprint 2. Reemplaza en vigencia a las notas sueltas de
> `PLAN_SPRINT2.md` (quedó como historial de la planificación) — este documento es el estado actual real.

---

## 1. Qué es Cardly

Videojuego web educativo de programación (proyecto de Software 2). El alumno resuelve ejercicios de código,
gana puntos/cartas coleccionables, arma un mazo y juega partidas 1v1 por turnos contra un bot.

**Dos repos independientes, clonados como carpetas hermanas:**

| Repo | Ruta local | Rama | Remote |
|---|---|---|---|
| Backend | `Back-SW2/` (este repo) | `alvaro` | `Luis-escobar-4774/Back-SW2` |
| Frontend | `../Front-SW2/` | `main` | `salcar420/Front-SW2` |

---

## 2. Arquitectura

```
Usuario → navegador → Front-SW2 (React 19 + TS + Vite, puerto 5173)
                          ↓ HTTP + JWT (Authorization: Bearer)
                       Back-SW2 (Express 5, puerto 3000)
                          ↓ Prisma 6
                       PostgreSQL (Supabase, compartida por el equipo)
```

### Backend — capas (controller → service → repository)

```
src/
├── index.js                  Bootstrap Express, monta todas las rutas
├── lib/
│   ├── prisma.js             Cliente Prisma (Singleton)
│   ├── auth.js                Hash de password + firma/verificación de JWT
│   ├── events.js             Bus de eventos interno (EventEmitter, patrón Observer)
│   ├── battleEngine.js       Motor de batalla — funciones PURAS, sin BD (ver §5)
│   └── validador.js          Strategy de validación de respuestas de ejercicios
├── middleware/
│   ├── requireAuth.js        Verifica JWT (Chain of Responsibility de Express)
│   └── optionalAuth.js
├── controllers/               Reciben el request, llaman al service, devuelven JSON
├── services/                  Lógica de negocio (orquesta repositories, no habla SQL directo)
│   ├── deckService.js        Mazo coleccionable (máx 12 cartas) — HU 9.4
│   ├── partidaService.js     Partida 1v1 vs bot — HU 9.J/9.1/9.2/9.9/9.10/9.3
│   ├── rankingService.js + rankingDecorators.js   Ranking + caché (patrón Decorator)
│   ├── rewardService.js + rewardFactory.js + rewardsFacade.js   Recompensas (Factory + Facade)
│   └── ...
├── repositories/              Única capa que habla con Prisma directamente
├── routes/                    Definen URL + middleware + controller
└── validators/                Schemas Zod de validación de input
```

### Frontend — por feature

```
src/
├── features/
│   ├── auth/                 Login/registro
│   ├── dashboard/             Home + stats
│   ├── ejercicios/ + resolver/  Arena de ejercicios + editor Python (Pyodide)
│   ├── modulos/               Contenido teórico
│   ├── inventario/            Colección de cartas (polling "tiempo real")
│   ├── mazo/                  DeckBuilder — HU 9.4 (nuevo esta sesión)
│   ├── partida/               Tablero de batalla — HU 9.J/9.1/9.2/9.9/9.10 (nuevo esta sesión)
│   └── ranking/                Podio + tabla + posición personal
├── lib/api.ts                  Instancia axios + interceptor JWT (Facade)
├── stores/auth.ts               Zustand (token + user, persistido en localStorage)
└── types/api.ts                 Tipos espejo del backend
```

---

## 3. Qué se hizo en esta sesión (Sprint 2)

Backlog completo de `sprint2.md`. Estado real verificado (no solo revisado en código — jugado en el
navegador de punta a punta):

| HU | Qué es | Estado |
|---|---|---|
| 3.5 / 3.12 / 3.7.RT | Inventario, atributos visibles, "tiempo real" (polling) | Ya existía, sigue funcionando |
| 3.4 / 3.4.P | Ranking Top + posición personal | Ya existía, sigue funcionando |
| **9.4** | Mazo personalizado (12 cartas) | **Nuevo**: `DeckBuilderPage.tsx` conectado a `GET/PUT /mazo` (el backend de esto ya existía) |
| **9.J / 9.9 / 9.10 / 9.3** | Partida 1v1 vs bot, maná, habilidades | **Nuevo**: motor completo backend (`battleEngine.js` + `partidaService.js`) + tablero frontend |
| **9.1** | Abandonar partida | **Nuevo**: endpoint + modal de confirmación |
| **9.2** | Puntos por victoria + ranking | **Nuevo**: +5 puntos transaccional + evento `GAME_WON` que invalida el caché de ranking |
| **9.7** | Cartas con rareza | **Ampliado**: catálogo de 8 → 21 cartas (12 común/5 rara/2 épica/2 legendaria) |
| QA.1 | Testing E2E por el equipo | Parcial — yo hice una pasada completa (ver §7), falta la del equipo (2 personas × 3 corridas) |
| QA.2 | Deploy a producción | Pendiente — requiere acceso a Vercel/Supabase prod, no hecho |

**Commits de esta sesión:**

Backend (`alvaro`): `4dcc271` (motor de partida completo), `ce8dbf7` (catálogo de 21 cartas).
Frontend (`main`): `0bd29af` (DeckBuilder), `4f78f17` (tablero de batalla + abandonar + resultado).

---

## 4. Cómo correrlo

### Opción A — Docker (recomendada, un solo comando)

Requiere Docker Desktop instalado y corriendo. Necesitás tener `Back-SW2/.env` con tus credenciales (igual
que para correrlo manual — ver `.env.example`).

```powershell
cd Back-SW2
docker compose up --build
```

Levanta:
- Backend en `http://localhost:3000`
- Frontend en `http://localhost:5173`

Detalles: `docker-compose.yml` (comentado) asume que `Front-SW2` está clonado como carpeta hermana de
`Back-SW2`. No levanta una base de datos propia — el backend se conecta a la misma Supabase compartida de
siempre a través de tu `.env` local. Si cambia el `schema.prisma`, correr la migración una vez (no es
automático en cada arranque del contenedor):

```powershell
docker compose run --rm backend npx prisma db push
```

> ⚠️ No pude probar el build de estos Dockerfiles en esta sesión — esta máquina no tiene el daemon de Docker
> instalado. Están escritos siguiendo el patrón estándar (multi-stage para el front, Alpine + openssl para
> Prisma en el back), pero la primera vez que alguien del equipo los corra, avisen si algo no levanta.

### Opción B — Manual (como hasta ahora)

```powershell
# Backend
cd Back-SW2
npm install
npx prisma generate
npm run dev          # http://localhost:3000

# Frontend (en otra terminal)
cd Front-SW2
npm install
npm run dev           # http://localhost:5173
```

Verificar: `GET http://localhost:3000/health` → `{ "status": "ok", "db": "up" }`.

---

## 5. Mecánica de batalla — resumen (detalle completo en `REGLAS_BATALLA.md`)

- Salud inicial: 30 para ambos jugadores. Maná: arranca 2/2, sube +1 por ronda (tope 10), se resetea
  completo cada ronda (no acumula).
- Mazo de batalla: **fijo**, 12 cartas temáticas de programación (Print Débil, Bucle For, Try/Except...),
  igual para el jugador y el bot — es un sistema separado del mazo coleccionable (HU 9.4), que solo actúa
  como *gate* de acceso ("¿tenés 12 cartas seleccionadas? entonces podés entrar a jugar").
- 3 tipos de habilidad: `dano` (daño plano), `cura` (cura a quien la juega), `critico` (daño + bonus).
- Un solo movimiento por turno. El turno del bot se resuelve en la MISMA request (sin segundo endpoint,
  sin WebSockets) — el "bot está pensando" del frontend es un delay cosmético de ~900ms, no un cómputo real.
- Bot = `RandomBotStrategy`: elige al azar entre las cartas que puede pagar. **Cero IA externa, cero API,
  cero token** — es lógica de código simple, a propósito.
- Todo el motor vive en funciones puras (`src/lib/battleEngine.js`) sin tocar la base de datos — se puede
  testear sin conexión a BD. La persistencia (incluyendo la transacción de +5 puntos en victoria) vive en
  `src/services/partidaService.js`.

---

## 6. Referencia de API (endpoints nuevos de esta sesión)

```http
# Mazo coleccionable (backend ya existía, se conectó el frontend esta sesión)
GET    /mazo                          (Bearer) → { items, total }
PUT    /mazo                          (Bearer) { cartaIds: number[] } → guarda el mazo (máx 12, sin duplicados, ownership validado)

# Partida (nuevo completo esta sesión)
POST   /partida                       (Bearer) → crea partida (valida mazo completo) → estado inicial
GET    /partida/:id                   (Bearer) → estado actual
POST   /partida/:id/jugar             (Bearer) { cartaId } → aplica jugada + turno del bot → estado actualizado
POST   /partida/:id/pasar             (Bearer) → pasa turno + turno del bot → estado actualizado
POST   /partida/:id/abandonar         (Bearer) → cierra como abandono, sin puntos
```

El resto de endpoints (auth, ejercicios, dashboard, módulos, pasos) no cambiaron esta sesión — ver
`CONTEXT.md` para el listado completo previo.

---

## 7. Verificación hecha esta sesión (no solo código)

1. **QA automático** (multiagente): encontró un bug real (`puntosGanados` no viajaba en la respuesta HTTP
   aunque sí se guardaba bien en la BD) — corregido en `partidaService.js`.
2. **Prueba directa contra la base de datos real**: script ad-hoc que crea una partida, fuerza al bot a 1 de
   salud, juega una carta letal, confirma `resultado=VICTORIA`, `puntosGanados=5` en la respuesta Y en la
   BD, y limpia el dato de prueba después.
3. **Prueba en el navegador de punta a punta** (usuario de prueba `qa_batalla`, con `grant-test-cards.js`
   ad-hoc para no depender del azar de recompensas): registro → armar mazo de 12 → gate de Partida se
   habilita → jugar una carta real (bajó la salud del bot, subió el maná, robó carta, log exacto) →
   abandonar con modal de confirmación → ranking reflejando 0 puntos correctamente. Sin errores de consola.

**Lo que falta para QA.1 completo:** que 2 miembros del equipo hagan el flujo completo (registro → GitHub →
ejercicio → partida → ranking) 3 veces cada uno, sin error 500 — es explícitamente una HU de "el equipo",
no algo que se resuelva con más código.

---

## 8. Pendientes

- **QA.1**: pasada del equipo (ver §7).
- **QA.2**: deploy a Vercel (front) + Supabase producción (back) — necesita accesos que no están en este
  entorno.
- **Limpieza de datos de prueba**: el usuario `qa_batalla@cardly.test` quedó en la base compartida (con
  12 cartas otorgadas manualmente para poder probar sin depender del azar). Borrar si molesta, o dejarlo
  como usuario de smoke-test.
- **Docker sin probar**: ver advertencia en §4 — validar en la primera corrida del equipo.

---

## 9. Archivos clave de esta sesión

```
Back-SW2/
├── REGLAS_BATALLA.md                  Fuente única de verdad de la mecánica de batalla
├── Dockerfile / .dockerignore / docker-compose.yml
├── prisma/schema.prisma                + modelo Partida, enum ResultadoPartida
├── prisma/seed.js                      + 13 cartas nuevas (21 total)
└── src/
    ├── lib/battleEngine.js             Motor puro de la partida
    ├── services/partidaService.js      Persistencia + puntos + evento GAME_WON
    ├── repositories/partidaRepository.js
    ├── controllers/partidaController.js
    ├── routes/partida.js
    └── validators/partida.validator.js

Front-SW2/
├── Dockerfile / .dockerignore / nginx.conf
└── src/features/
    ├── mazo/                           DeckBuilderPage.tsx + api.ts
    └── partida/                        PartidaPage.tsx + api.ts + components/
                                         (ManaBar, SaludBar, CartaMano, LogPanel,
                                          AbandonarModal, FinPartidaModal)
```
