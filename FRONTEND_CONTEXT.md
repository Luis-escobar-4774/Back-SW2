# Cardly — Contexto del Frontend

Frontend del videojuego web educativo **Cardly** (Software 2). Consume el backend [Back-SW2](./CONTEXT.md). Este documento es la guia de onboarding para el equipo que implementa la interfaz.

---

## 1. Que tiene que hacer el frontend

Es un **videojuego web educativo** para aprender programacion. Combina:
- **Sistema de cuenta**: registro / login con email + password.
- **Catalogo de ejercicios** con dificultad, lenguaje y casos de prueba.
- **Editor / formulario de envio** donde el alumno manda su codigo u output esperado.
- **Feedback en tiempo real**: el backend devuelve si fue correcto, las recompensas obtenidas (puntos + carta) y el tiempo registrado.
- **Dashboard de jugador**: puntos, monedas, ranking, racha, cartas coleccionadas.
- **Plataforma educativa**: modulos divididos en pasos secuenciales, con porcentaje de progreso y atajo a los ejercicios del tema.
- **Inventario de cartas** con rareza, niveles y stats (dano, salud, mana).

> **Importante:** **NO hay integracion con GitHub** (ni auth ni webhooks). El alumno envia su respuesta directamente desde el frontend; el backend la compara contra soluciones predefinidas en BD.

---

## 2. Stack recomendado

Cualquier stack moderno funciona, pero recomendamos:

| Capa | Recomendado | Razon |
|---|---|---|
| Framework | **React 18+ con Vite** | DX rapida, ecosistema enorme, alineado con el resto del stack del curso. |
| Lenguaje | **TypeScript** | Tipa los DTOs del backend, evita bugs comunes. Tambien permite cumplir mejor con Interface Segregation y Dependency Inversion. |
| Router | **React Router 6** | Standard. |
| Estado server | **TanStack Query (React Query)** | Cache, refetch, invalidacion automatica. Reemplaza mucho `useEffect + fetch`. |
| Estado UI | **Zustand** o **Context** | Para auth, modales globales, etc. Evitar Redux salvo que ya lo dominen. |
| HTTP | **axios** o **fetch** envuelto en un client | Ver patron Facade abajo. |
| Forms | **react-hook-form + zod** | El backend tambien usa zod; pueden compartir schemas. |
| Estilos | **Tailwind CSS** o **CSS modules** | Tailwind por velocidad; CSS modules si prefieren componentes encapsulados. |
| UI kit | **shadcn/ui** o **Mantine** | Componentes accesibles listos para customizar. |

Alternativa razonable: **Next.js 14** si quieren SSR o rutas anidadas mas robustas.

---

## 3. Pantallas requeridas (mapeo a HU)

| Pantalla | HU | Descripcion | Endpoints |
|---|---|---|---|
| **Registro** | HU1 | Form: email, username, password | `POST /auth/register` |
| **Login** | HU2 | Form: email, password | `POST /auth/login` |
| **Home / Dashboard** | HU3, HU8, HU9, HU10 | Top: stats (puntos, cartas, ranking, racha). Centro: ejercicios pendientes (max 5). Botones: "Ir a ejercicios", "Jugar" | `GET /dashboard`, `GET /ejercicios/activos` |
| **Listado de ejercicios** | HU3 | Cards con titulo, dificultad, lenguaje. Filtros: modulo, dificultad. | `GET /ejercicios` |
| **Detalle de ejercicio** | HU4 | Descripcion, casos de prueba (input/output), dificultad, modulo asociado. Boton "Resolver". | `GET /ejercicios/:id` |
| **Resolver ejercicio** | HU5, HU6, HU7 | Tabs: "Codigo" / "Outputs". Cronometro arriba. Boton "Enviar". Al recibir respuesta: modal con resultado + recompensas obtenidas (incluyendo carta animada) o motivo del error. | `POST /ejercicios/:id/submit` |
| **Modulos** | HU12 | Lista de modulos con titulo, descripcion, progreso (%) | `GET /modulos` (con token) |
| **Detalle de modulo** | HU11, HU13 | Pasos en orden con check de completado. Boton "Marcar completado". Boton "Ver ejercicios de este modulo" | `GET /modulos/:id`, `POST /pasos/:id/completar`, `GET /modulos/:id/ejercicios` |
| **Mi inventario** | HU9 | Grid de cartas del usuario con rareza, nivel actual, stats. | `GET /dashboard/mis-cartas` |
| **Ranking** | HU10 | Top 10/20 con username y puntos. Marca al usuario actual. | `GET /dashboard/ranking` |

---

## 4. Flujo de autenticacion

```
[Pantalla Login]
   │
   ├── POST /auth/login { email, password }
   │
   └── Recibe { user, token }
       │
       ├── Guardar token (localStorage o cookie httpOnly)
       ├── Guardar user en estado global (Context/Zustand)
       └── Redirigir a /dashboard

[Cada request a endpoint protegido]
   │
   └── Header: Authorization: Bearer <token>

[Si la respuesta es 401]
   │
   └── Limpiar token + redirigir a /login (interceptor)

[Logout]
   │
   └── Borrar token + redirigir a /login
```

**Recomendacion:** poner un **interceptor** (axios o fetch wrapper) que:
1. Inyecte el header `Authorization` si hay token.
2. Capture respuestas `401` y dispare logout automatico.

El JWT actual expira en **7 dias** (`JWT_EXPIRES_IN=7d` en backend).

---

## 5. Endpoints a consumir

> URL base del backend en dev: `http://localhost:3000`

### 5.1 Auth

#### `POST /auth/register`
```json
// Request
{ "email": "u@x.com", "username": "user1", "password": "minimo8chars" }

// Response 201
{
  "user": { "id": 1, "email": "...", "username": "...", "rol": "ALUMNO", "puntos": 0, ... },
  "token": "eyJhbGciOi..."
}

// Errores
// 400 -> { "error": "Invalid input", "details": { "email": [...] } }
// 409 -> { "error": "email already in use" }
```

#### `POST /auth/login`
```json
// Request
{ "email": "u@x.com", "password": "..." }

// Response 200
{ "user": {...}, "token": "..." }

// Errores
// 401 -> { "error": "Invalid email or password" }
```

#### `GET /auth/me` *(requiere Bearer)*
```json
// Response 200
{ "user": { "id": 1, "email": "...", ... } }
```

### 5.2 Ejercicios

#### `GET /ejercicios?moduloId=&dificultad=&lenguaje=`
```json
{
  "items": [
    {
      "id": 1,
      "titulo": "Suma de dos numeros",
      "descripcion": "...",
      "dificultad": "FACIL",
      "lenguaje": "python",
      "tiempoEstimadoSeg": 300,
      "moduloId": 1,
      "casosPrueba": [
        { "input": "2 3", "outputEsperado": "5" }
      ]
    }
  ],
  "total": 5
}
```

#### `GET /ejercicios/:id`
Devuelve el detalle con `modulo` y `recompensas`. **No expone `solucionesCodigo`**.

#### `GET /ejercicios/activos` *(Bearer)*
Top 5 pendientes del usuario.

#### `POST /ejercicios/activos` *(Bearer)*
```json
// Request
{ "ejercicioId": 1 }

// Response 201 -> el activo creado
```

#### `POST /ejercicios/:id/submit` *(Bearer)*
```json
// Request (opcion A: por codigo)
{
  "tipo": "codigo",
  "respuesta": "a, b = map(int, input().split())\nprint(a + b)",
  "tiempoResolucionSeg": 120
}

// Request (opcion B: por output, array)
{
  "tipo": "output",
  "respuesta": ["5", "30", "0"],
  "tiempoResolucionSeg": 120
}

// Response 200 (siempre 200, el campo `correcto` indica el resultado)
{
  "correcto": true,
  "motivo": "Todos los outputs coinciden",
  "tiempoResolucionSeg": 120,
  "recompensas": [
    { "tipo": "PUNTOS", "cantidad": 10 },
    { "tipo": "CARTA", "carta": { "id": 7, "nombre": "Dragon de Hielo", "rareza": "LEGENDARIA", "imagen": "dragon_hielo.png" } }
  ],
  "puntosActuales": 10,
  "monedasActuales": 0,
  "rachaEjercicios": 1
}
```

### 5.3 Dashboard *(todos Bearer salvo `/ranking`)*

```
GET /dashboard          -> stats del usuario + posicion en ranking
GET /dashboard/ranking  -> top N (sin auth, ?limit=10)
GET /dashboard/mis-cartas -> inventario
```

### 5.4 Modulos / Pasos

```
GET    /modulos              -> lista (incluye progreso si pasas Bearer)
GET    /modulos/:id          -> detalle con pasos
GET    /modulos/:id/ejercicios -> ejercicios del modulo
POST   /pasos/:id/completar  -> marca completado (Bearer)
DELETE /pasos/:id/completar  -> desmarca (Bearer)
```

---

## 6. Estructura sugerida del proyecto

```
cardly-front/
├── src/
│   ├── main.tsx              # Entry
│   ├── App.tsx               # Router root
│   ├── api/                  # Capa de acceso al backend
│   │   ├── client.ts         # Axios instance + interceptors (Facade)
│   │   ├── auth.ts           # login, register, me
│   │   ├── ejercicios.ts
│   │   ├── dashboard.ts
│   │   └── modulos.ts
│   ├── hooks/                # Custom hooks (useAuth, useEjercicio, ...)
│   ├── stores/               # Zustand stores (authStore, ...)
│   ├── components/
│   │   ├── ui/               # Botones, inputs, modales, base
│   │   ├── ejercicio/        # Componentes especificos de ejercicios
│   │   ├── cartas/
│   │   └── layout/           # Sidebar, Topbar, etc.
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── EjerciciosPage.tsx
│   │   ├── EjercicioDetallePage.tsx
│   │   ├── ResolverEjercicioPage.tsx
│   │   ├── ModulosPage.tsx
│   │   ├── ModuloDetallePage.tsx
│   │   ├── InventarioPage.tsx
│   │   └── RankingPage.tsx
│   ├── types/                # Tipos TS compartidos (DTOs del backend)
│   ├── utils/                # Helpers (formatTiempo, etc.)
│   └── styles/
├── public/
├── .env                      # VITE_API_URL=http://localhost:3000
├── .env.example
├── package.json
└── README.md
```

---

## 7. Bases de Ingenieria de Software 2 (SOLID + Patrones) en el FE

Estos son los lugares naturales donde aplicar los patrones que pide SW2 en el frontend:

### 7.1 SOLID en React

| Principio | Como aplicar en FE |
|---|---|
| **Single Responsibility** | Separar **componentes de presentacion** (UI pura, props in / events out) de **containers / hooks** (logica, fetching). Un componente que hace fetch, transforma, renderiza Y maneja errores viola SRP. |
| **Open/Closed** | Los componentes deben extenderse via **composicion y props**, no editando la implementacion. Ej: `<Button variant="primary">` en vez de `<PrimaryButton>` con su propio JSX duplicado. |
| **Liskov** | Si tienen un `<Card>` base y `<CartaJugador extends Card>`, deben funcionar intercambiables. Aplicable a custom hooks que comparten firma. |
| **Interface Segregation** | Props del componente: pequenas y enfocadas. Un componente que recibe 15 props mezclando responsabilidades debe partirse. |
| **Dependency Inversion** | Componentes no deben hacer `fetch` directo. Inyectar via hooks (`useEjercicios()`) o servicios (`api.ejercicios.list()`). El componente no sabe de HTTP. |

### 7.2 Patrones creacionales en el FE

| Patron | Donde aplicar |
|---|---|
| **Singleton** | El **API client** (axios instance) debe ser singleton: una instancia global con su baseURL e interceptors. Tambien el store global (Zustand crea un singleton por defecto). |
| **Factory** | Para crear componentes dinamicamente. Ej: un `RecompensaFactory` que dado un `tipo` ('PUNTOS', 'CARTA', 'MONEDAS') renderiza el componente de notificacion adecuado. |
| **Builder** | Construir queries complejas: `new EjerciciosQueryBuilder().conModulo(2).dificultad('FACIL').build()` → genera el querystring. |

### 7.3 Patrones estructurales en el FE

| Patron | Donde aplicar |
|---|---|
| **Adapter** | Convertir respuestas del backend a un modelo conveniente para la UI. Ej: la API devuelve `tiempoEstimadoSeg: 300`; el componente quiere `"5 min"`. Hacer un `adaptEjercicio(dto)` que normalice. |
| **Facade** | El `api/client.ts` es un Facade: oculta axios, interceptors, base URL, manejo de errores. Los componentes solo conocen `api.ejercicios.list()`. |
| **Decorator** | **Higher-Order Components** y **decoradores de hooks** son ejemplos. Ej: `withAuth(Component)` redirige a /login si no hay token. `useWithLoading(useEjercicios())` agrega estado de loading. |
| **Composite** | El arbol de React **es** Composite: un componente puede contener otros del mismo "tipo" (componentes) y tratarse uniformemente. Util al renderizar listas anidadas (Modulo → Pasos → SubItems). |
| **Proxy** | **TanStack Query** actua como Proxy con cache: las llamadas pasan por el cache antes de llegar al backend. Tambien sirve para feature flags: un `<FeatureGate flag="x">` proxy que decide si renderizar el hijo. |

### 7.4 Patrones de comportamiento en el FE

| Patron | Donde aplicar |
|---|---|
| **Observer** | El estado global (Zustand, Context, Redux) **es** Observer: los componentes se suscriben a slices del store y re-renderizan cuando cambian. |
| **Strategy** | Tabs de "Codigo" vs "Output" en la pantalla de resolver: cada tab tiene su componente con su validacion y formato propios, intercambiables. Tambien para distintos modos de display: `<ListaEjercicios mode="grid"\|"table"\|"compact">` con strategies de render. |
| **Command** | Cada accion del usuario (asignar ejercicio, marcar paso, enviar) puede modelarse como command con `execute()` + `undo()`. React-Query mutations cumple este rol. |
| **State** | El formulario de resolver ejercicio tiene estados: `editando` → `enviando` → `mostrando_resultado` → `editando`. Modelar como state machine (xstate o switch en useReducer) en vez de N flags booleanos. |
| **Template Method** | Si tienen multiples pantallas con el mismo layout (cargar datos → mostrar loading → render → manejar error), un componente base / hook generico aplica template method para que cada pantalla solo implemente las partes especificas. |

### 7.5 Patrones especificos de React que vale destacar

- **Container / Presentational** (separacion estricta de logica vs UI) — viola SRP cuando se mezclan.
- **Custom hooks** — equivalente a un servicio inyectable; encapsula logica reutilizable.
- **Render props** — variante de Strategy en React.
- **Compound components** — variante de Composite. Ej: `<Tabs><Tabs.List><Tabs.Trigger>` se comunican implicitamente via Context.

---

## 8. Variables de entorno

```bash
# .env
VITE_API_URL=http://localhost:3000
# Si despliegan el backend en algun sitio:
# VITE_API_URL=https://api.cardly.example.com
```

En el codigo: `import.meta.env.VITE_API_URL`.

---

## 9. Estado del backend (que ya esta listo para consumir)

### ✅ Implementado y testeado
- Auth completo (register, login, me) con JWT
- Ejercicios: list, detail, asignar a usuario, submit con validacion (codigo y output)
- Recompensas: puntos + carta aleatoria al resolver correcto
- Dashboard: stats + ranking global + inventario
- Modulos / pasos: listado, detalle, progreso por usuario, marcar completado
- Seed de datos demo: 3 modulos, 9 pasos, 5 ejercicios, 8 cartas

### ⚠️ Pendiente del backend (afecta al FE)
- **Aulas / Profesores / Asignaciones grupales** — endpoints no existen aun.
- **CRUD admin de ejercicios / modulos / cartas** — hoy solo via seed. Si la pantalla del profesor necesita crear ejercicios, hay que implementar primero el backend.
- **Notificaciones de actualizacion** — sin endpoint.
- **Refresh token** — el JWT actual no se refresca. Al expirar (7 dias) hay que volver a loguear.

### 🔒 Seguridad (lado backend)
- **Rotar password de Supabase** antes de exponer mas alla del equipo.
- **CORS abierto** actualmente — restringir a dominio del FE en deploy.

---

## 10. Como empezar (frontend)

Asumiendo React + Vite + TypeScript:

```bash
# 1. Crear proyecto
npm create vite@latest cardly-front -- --template react-ts
cd cardly-front
npm install

# 2. Instalar dependencias base
npm install react-router-dom @tanstack/react-query axios zod react-hook-form @hookform/resolvers zustand

# 3. Estilos (opcional)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 4. Crear .env con VITE_API_URL

# 5. Levantar backend en otra terminal:
#    cd ../Back-SW2 && npm run dev

# 6. Levantar frontend
npm run dev
```

---

## 11. Sugerencia de orden de implementacion

1. **Setup** — vite + router + tailwind + api client + auth store.
2. **Auth (HU1, HU2)** — pantallas de login y registro.
3. **Dashboard basico (HU8, HU9, HU10)** — mostrar stats + ranking.
4. **Listado de ejercicios (HU3)** — incluye `/ejercicios/activos`.
5. **Detalle + resolver ejercicio (HU4, HU5, HU6, HU7)** — la pantalla mas compleja.
6. **Modulos / Pasos (HU11, HU12, HU13)**.
7. **Inventario de cartas (HU9 ampliada)**.
8. **Pulido**: animaciones de recompensa, estados de loading, errores amigables, responsividad.

---

## 12. Notas para el equipo de FE

- **No commitear `.env`** — usar `.env.example` como template.
- **Tipar los DTOs del backend** en `src/types/` desde el inicio. Evita bugs por respuestas mal asumidas.
- **El backend devuelve fechas como ISO strings** (`"2026-05-24T06:22:10.564Z"`). Parsear con `new Date(str)` o `date-fns`.
- **Todos los IDs son `number`** (no string ni uuid). El JWT guarda el `sub` como numero.
- **El cronometro del ejercicio** debe correr en el frontend; al enviar, mandar `tiempoResolucionSeg` calculado localmente.
- **Coordinar con backend** antes de pedir endpoints nuevos — el contrato esta en este doc + `CONTEXT.md`.
