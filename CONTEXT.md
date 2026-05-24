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
│   ├── schema.prisma       # 13 modelos
│   └── seed.js             # Datos demo
├── src/
│   ├── index.js            # Bootstrap Express, monta rutas
│   ├── lib/
│   │   ├── prisma.js       # Cliente Prisma (Singleton)
│   │   ├── auth.js         # hash / verify password, sign / verify JWT
│   │   └── validador.js    # Logica de validacion de respuestas
│   ├── middleware/
│   │   └── requireAuth.js  # Verifica Bearer token
│   └── routes/
│       ├── auth.js         # /auth/*
│       ├── ejercicios.js   # /ejercicios/*
│       ├── dashboard.js    # /dashboard/*
│       ├── modulos.js      # /modulos/*
│       └── pasos.js        # /pasos/*
├── .env                    # NO commitear
├── .env.example            # Template para el equipo
├── package.json
└── CONTEXT.md              # Este archivo
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

## 6. Bases de Ingenieria de Software 2 (SOLID + Patrones)

Esta seccion documenta **donde estamos** y **donde refactorizar** para cumplir con los principios y patrones que pide SW2.

### 6.1 SOLID

| Principio | Estado actual | Que falta / refactor sugerido |
|---|---|---|
| **S — Single Responsibility** | Las rutas hoy hacen tres cosas: validar input, ejecutar logica de negocio y hablar con la BD. | Separar en **Controllers** (HTTP), **Services** (negocio) y **Repositories** (BD). Ej: `EjercicioService.submit()` orquesta, `EjercicioRepository` queries. |
| **O — Open/Closed** | El validador usa `if (tipo === 'codigo') ... else if (tipo === 'output')`. Agregar un nuevo tipo obliga a editar la funcion. | Aplicar **Strategy** (ver 6.4). Cada tipo de validacion = una clase / objeto registrado. Agregar tipos sin tocar el switch. |
| **L — Liskov Substitution** | Pendiente: cuando se introduzcan jerarquias (ej. `Recompensa` → `RecompensaPuntos`, `RecompensaCarta`) hay que asegurar que sustituirlas no rompa el sistema. | Disenar las clases hijas de recompensa con la misma firma (`otorgar(usuario, tx)` por ejemplo). |
| **I — Interface Segregation** | JavaScript no tiene interfaces nativas, pero se puede via duck typing / TypeScript. | Si migramos a TS: definir interfaces pequenas (`IValidador`, `IOtorgable`, `IRepositorio<T>`) en vez de una interface gigante. |
| **D — Dependency Inversion** | Las rutas importan `prisma` directamente; los services no existen. | Inyectar dependencias: las rutas reciben un service, el service recibe un repository, el repository recibe `prisma`. Permite mockear en tests. |

### 6.2 Patrones creacionales

| Patron | Estado | Donde aplicar |
|---|---|---|
| **Singleton** | **Aplicado** en `src/lib/prisma.js`: una unica instancia de `PrismaClient` reutilizada en todo el app. Evita explotar el pool de conexiones. | — |
| **Factory Method** | No aplicado. | Crear un `RecompensaFactory.crear(tipo)` que devuelva una instancia de `RecompensaPuntos`, `RecompensaMonedas` o `RecompensaCarta`. La logica de drop se delega al objeto en vez de un switch dentro de `submit`. |
| **Abstract Factory** | No aplicado. | Si surgen "familias" coherentes (ej. para distintos lenguajes de programacion: `ValidadorPython`, `ValidadorJava` con sus propios normalizadores y reglas), usar una AbstractFactory de validadores por lenguaje. |
| **Builder** | No aplicado. | Para construir el detalle de un ejercicio con casos de prueba, recompensas, y modulo asociado (DTO complejo), un `EjercicioResponseBuilder` mejora la legibilidad. |
| **Prototype** | No aplicado. | Para clonar `Carta` template al instanciarla como `UsuarioCarta` (hoy es solo una FK). Util si en el futuro las instancias tienen mutaciones (ej. cartas mejoradas con stats unicas). |

### 6.3 Patrones estructurales

| Patron | Donde aplicar |
|---|---|
| **Adapter** | Envolver Prisma detras de un adaptador `Repository` con metodos del dominio (`UsuarioRepository.crear`, `UsuarioRepository.buscarPorEmail`). Si manana cambiamos de ORM, solo cambia el adaptador. |
| **Facade** | `AuthFacade` que expone un metodo `registrar(input)` y por dentro coordina: validacion, hash, persistencia y emision de JWT. La ruta se vuelve un one-liner. |
| **Decorator** | Aplicar a las recompensas: una recompensa base se decora con "doble por racha de 5+" sin tocar la clase base. Tambien aplicable a middleware (ej. `loggingMiddleware(authMiddleware(handler))`). |
| **Composite** | Modulo → Pasos puede modelarse como Composite: ambos comparten interfaz `Completable.porcentajeProgreso()`. Util si en el futuro hay sub-modulos. |
| **Proxy** | Cache de lecturas frecuentes (ranking global): un `RankingProxy` envuelve al repository y devuelve resultados memoizados por N segundos. |

### 6.4 Patrones de comportamiento

| Patron | Donde aplicar |
|---|---|
| **Strategy** | **Prioritario.** `validador.js` ya tiene la forma: extraer `ValidadorCodigo` y `ValidadorOutput` como clases con metodo comun `validar(respuesta, ejercicio)`. Un registro las indexa por nombre. Permite agregar `ValidadorPseudocodigo`, `ValidadorJudge0` etc. sin tocar `submit`. |
| **Observer** | Cuando el usuario resuelve correctamente, varias cosas reaccionan: actualizar puntos, otorgar carta, romper/sumar racha, notificar al cliente. Modelar como `EjercicioResueltoEvent` con suscriptores (`PuntosListener`, `CartaListener`, `RachaListener`). Hoy esta todo en `submit`. |
| **Command** | Cada accion del alumno (asignar, enviar, completar paso) podria modelarse como Command con `execute()` y `undo()`. Facilita auditoria y, si se quiere, "deshacer" un intento. |
| **State** | El `Ejercicio_Activo` cambia entre PENDIENTE → RESUELTO. Modelarlo como State machine permite agregar estados futuros (EN_REVISION, VENCIDO) sin condicionales dispersos. |
| **Template Method** | Para los distintos `Validador*`, definir una clase base abstracta `ValidadorBase` con `validar(...)` que llama a hooks `normalizar()` y `comparar()` implementados en subclases. |
| **Chain of Responsibility** | Express middleware **ya es** Chain of Responsibility. `requireAuth` ilustra el patron (decide si pasar al siguiente handler o cortar). |

### 6.5 Roadmap de refactor a SW2-compliant

Orden sugerido (no destructivo, se puede hacer incremental sin romper endpoints):

1. **Crear capa `repositories/`** — extraer todas las queries Prisma de las rutas a `UsuarioRepository`, `EjercicioRepository`, etc. (Adapter + Dependency Inversion)
2. **Crear capa `services/`** — mover logica de negocio a `AuthService`, `EjercicioService`, `RecompensaService`. (Single Responsibility)
3. **Refactor `validador.js`** a Strategy con clases `ValidadorCodigo` y `ValidadorOutput` y un registro. (Strategy + Open/Closed)
4. **Refactor `submit`** con un `RecompensaFactory` y Observers (`PuntosListener`, `CartaListener`, `RachaListener`). (Factory Method + Observer)
5. **Wrap Prisma queries pesadas** (ranking) con un Proxy de cache. (Proxy)
6. (Opcional) Migrar a TypeScript para tener interfaces explicitas y aprovechar Liskov / Interface Segregation con el compilador.

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
