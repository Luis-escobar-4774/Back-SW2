# Reglas de la Batalla (Partida 1v1 vs Bot) — Cardly Sprint 2

> Fuente: `Cardly Partida (standalone).html` (mockup funcional pasado por el usuario). El archivo es un bundle
> comprimido (gzip+base64) de un prototipo — no es texto plano. Se descomprimió y se leyó la clase
> `Component extends DCLogic` que contiene el motor de juego completo y ya validado por el usuario en la UI.
> Este documento es la traducción exacta de esa lógica a reglas de negocio, y es la **fuente única de verdad**
> para implementar el backend y el frontend. No inventar variantes — si algo no está aquí, no está en el sprint.

---

## 1. Conceptos clave

- **Partida**: una sesión de juego 1v1 entre el usuario autenticado y un bot. Por turnos, alternando.
- **Mazo de batalla**: NO es el mazo de 12 cartas coleccionables que arma el usuario en el DeckBuilder
  (HU 9.4). Es un **pool fijo de 12 cartas de combate** (ver §2), igual para todos los usuarios y para el bot.
  El mazo coleccionable (HU 9.4) es un **requisito de acceso** ("tener 12 cartas seleccionadas" desbloquea el
  botón "Iniciar Partida"), no las cartas que se juegan dentro de la partida.
- **Salud inicial**: 30 para ambos jugadores (constante, no configurable en producción).
- **Maná**: empieza en 2/2 para ambos. Sube en +1 cada ronda (al terminar el turno del bot), con tope de 10.
  El maná **no se acumula entre rondas**: al empezar una ronda nueva, el maná de ambos se resetea al nuevo
  máximo (no es maná-sobrante + incremento).
- **Mano inicial**: 4 cartas (barajadas desde el pool de 12). El resto (8 cartas) queda como "mazo restante"
  del que se roba.
- **Robo de carta**: 1 carta por ronda por jugador. El bot roba al empezar SU turno (antes de decidir qué
  jugar); el usuario roba cuando termina el turno del bot (antes de que empiece su turno siguiente). Si el
  mazo restante de un jugador ya está vacío, simplemente no roba nada (sin penalización — no hay "fatiga").
- **Un solo movimiento por turno**: cada turno, un jugador juega **como máximo 1 carta** (o pasa si ninguna es
  pagable). No existe "jugar varias cartas y terminar turno manualmente" — apenas se juega (o se pasa), el
  turno pasa inmediatamente al rival.

---

## 2. Pool de cartas de batalla (fijo, igual para jugador y bot)

Cada carta: `{ id, nombre, rareza, mana, dano, habTipo, habVal, habNombre, glifo }`.

`habTipo` solo puede ser uno de tres valores:
- `"dano"` — la carta hace `dano` de daño plano al rival. `habVal` no aplica (0).
- `"cura"` — la carta cura a **quien la juega** por `habVal` (capado a la salud máxima, 30). No hace daño.
- `"critico"` — la carta hace daño = `dano + habVal` al rival (el `habVal` es el bonus del crítico).

| id | nombre | rareza | mana | dano | habTipo | habVal | habNombre | glifo |
|---|---|---|---|---|---|---|---|---|
| 1 | Print Débil | COMUN | 1 | 2 | dano | 0 | Golpe simple | `>>>` |
| 2 | Bucle For | COMUN | 2 | 3 | dano | 0 | Iteración | `for` |
| 3 | Try / Except | COMUN | 2 | 0 | cura | 4 | Recuperación | `try` |
| 4 | If / Else | RARA | 3 | 4 | dano | 0 | Bifurcación | `if` |
| 5 | While True | RARA | 3 | 5 | dano | 0 | Ciclo infinito | `∞` |
| 6 | Lista Enlazada | RARA | 3 | 0 | cura | 6 | Append vital | `[ ]` |
| 7 | Def Función | EPICA | 4 | 6 | dano | 0 | Invocación | `def` |
| 8 | Lambda | EPICA | 4 | 5 | critico | 3 | Golpe anónimo | `λ` |
| 9 | Decorador | EPICA | 5 | 7 | dano | 0 | Envoltura | `@` |
| 10 | Dict Maestro | LEGENDARIA | 5 | 4 | cura | 6 | Clave vital | `{ }` |
| 11 | Recursión | LEGENDARIA | 6 | 9 | critico | 3 | Llamada profunda | `f(f)` |
| 12 | Quicksort | LEGENDARIA | 7 | 11 | dano | 0 | Orden absoluto | `⇅` |

Esta tabla es literal — no renombrar, no cambiar números. Es contenido ya diseñado y balanceado (curva de
maná 1,2,2,3,3,3,4,4,5,5,6,7) por el mockup validado.

---

## 3. Algoritmo del motor (server-authoritative — el backend decide todo, el front solo refleja)

### 3.1. Iniciar partida — `POST /partida`

Precondición: el usuario debe tener su mazo coleccionable completo (12 cartas seleccionadas — usar
`deckService.getDeck(usuarioId)`, ya existe). Si no → 400 con mensaje claro, no crear partida.

Si cumple:
1. Barajar el pool de 12 cartas (Fisher-Yates) **una vez para el jugador y otra vez para el bot** —
   son barajadas independientes, no comparten el mismo orden.
2. Estado inicial:
   - `salud` = 30 para ambos.
   - `mana` = 2, `manaMax` = 2 para ambos.
   - `mano` = primeras 4 cartas de cada baraja; `mazo` = las 8 restantes.
   - `turno` = `"usuario"`.
   - `ronda` = 1.
   - `resultado` = `null`.
   - `log` = `["Comienza la partida — tu turno. Maná 2/2."]`.
3. Persistir y devolver el estado completo.

### 3.2. Jugar una carta — `POST /partida/:id/jugar { cartaId }`

Validar (en este orden, cortar en el primer fallo con 400/403/409 según corresponda):
1. La partida pertenece al usuario autenticado.
2. La partida no está finalizada (`resultado === null`).
3. Es el turno del usuario (`turno === "usuario"`).
4. La carta existe en la mano del usuario.
5. `carta.mana <= jugador.mana`.

Aplicar el efecto:
- Si `habTipo === "cura"`: `jugador.salud = min(30, jugador.salud + habVal)`.
- Si no (`dano` o `critico`): `dmg = carta.dano + (habTipo === "critico" ? habVal : 0)`; `bot.salud -= dmg`.
- Quitar la carta de la mano del jugador. `jugador.mana -= carta.mana`. Guardar como "última jugada del
  jugador". Agregar línea al log.

**Chequeo de victoria inmediato:** si `bot.salud <= 0` → la partida termina en `"VICTORIA"` **antes** de que
el bot juegue (el bot no tiene una última jugada de revancha). Ir a §3.4.

Si no terminó, ejecutar el turno del bot **en la misma request** (síntesis, no hay un segundo endpoint):

1. El bot roba 1 carta de su mazo restante (si tiene).
2. `jugables = bot.mano.filter(c => c.mana <= bot.mana)`.
3. Si `jugables` está vacío → el bot pasa ("El bot pasa el turno (sin maná suficiente).").
4. Si no → el bot elige **una carta al azar** entre las jugables (esto es "la IA": `RandomBotStrategy`,
   sin ningún cómputo inteligente real). Aplica el mismo efecto que en el punto anterior pero invertido
   (cura al bot, o daño al jugador). Quita la carta de su mano, resta el maná, guarda "última jugada del bot".

**Chequeo de derrota inmediato:** si `jugador.salud <= 0` tras la jugada del bot → la partida termina en
`"DERROTA"`. Ir a §3.4.

Si nadie ganó, cerrar la ronda:
- `manaMax = min(10, manaMax + 1)`.
- `jugador.mana = manaMax` y `bot.mana = manaMax` (reset completo, no acumulativo).
- El jugador roba 1 carta de su mazo restante (si tiene).
- `turno = "usuario"`, `ronda += 1`.

Persistir el nuevo estado y devolverlo completo (incluye ambas jugadas — la del jugador y la del bot — para
que el frontend pueda animar ambas, aunque haya sido una sola request).

### 3.3. Pasar turno — `POST /partida/:id/pasar`

Mismas validaciones 1-3 de §3.2 (sin validar carta, porque no se juega ninguna). Directamente ejecuta la
sección "turno del bot" de §3.2 (con el punto 2 en adelante) sin aplicar ningún efecto propio primero. Útil
cuando ninguna carta de la mano es pagable — el frontend debe mostrar el botón "Pasar turno" **solo** en ese
caso (si hay al menos una carta jugable, no se ofrece pasar — el servidor no bloquea la llamada igual, pero
la UI no debe invitar a pasar si hay opciones).

### 3.4. Fin de partida

- `"VICTORIA"`: `usuario.puntos += 5` (transacción atómica), `puntosGanados = 5`, emitir evento
  `EVENTS.GAME_WON` (bus de eventos ya existente en `src/lib/events.js`) para que `rankingDecorators.js`
  invalide su caché igual que ya hace con `EXERCISE_COMPLETED` — una línea, mismo patrón, no crear un
  mecanismo nuevo.
- `"DERROTA"`: sin puntos.
- `"ABANDONO"` (§3.5): sin puntos.
- En los tres casos: `resultado` queda fijado, `finalizadaEn = now()`, no se puede volver a jugar/pasar sobre
  esa partida (validación 2 de §3.2 ya lo cubre).

### 3.5. Abandonar — `POST /partida/:id/abandonar`

Requiere confirmación en el frontend (modal, no un solo click) antes de llamar al endpoint. Válido en
cualquier momento mientras `resultado === null`. Marca `resultado = "ABANDONO"`, sin puntos.

### 3.6. Consultar estado — `GET /partida/:id`

Devuelve el estado actual tal cual está persistido. Para recargas de pantalla o polling (no hace falta
WebSockets/SSE — es un juego por turnos donde solo el jugador dispara la siguiente acción).

---

## 4. Modelo de datos

```prisma
enum ResultadoPartida {
  VICTORIA
  DERROTA
  ABANDONO
}

model Partida {
  id            Int               @id @default(autoincrement())
  usuarioId     Int               @map("usuario_id")
  resultado     ResultadoPartida?
  puntosGanados Int               @default(0) @map("puntos_ganados")
  ronda         Int               @default(1)
  iniciadaEn    DateTime          @default(now()) @map("iniciada_en")
  finalizadaEn  DateTime?         @map("finalizada_en")
  // Snapshot completo y autocontenido del estado de juego — mismo patrón que
  // Ejercicio.casosPrueba/solucionesCodigo (columna Json en vez de tablas satélite).
  estado        Json              @default("{}")

  usuario User @relation(fields: [usuarioId], references: [id])

  @@index([usuarioId])
  @@map("partidas")
}
```

Agregar en `User`: `partidas Partida[]`.

### Forma de `estado` (JSON)

```json
{
  "saludMax": 30,
  "manaMax": 2,
  "ronda": 1,
  "turno": "usuario",
  "resultado": null,
  "jugador": { "salud": 30, "mana": 2, "mano": [/* CartaBatalla[] */], "mazo": [/* CartaBatalla[] */] },
  "bot":      { "salud": 30, "mana": 2, "mano": [/* CartaBatalla[] */], "mazo": [/* CartaBatalla[] */] },
  "ultimaJugadaJugador": null,
  "ultimaJugadaBot": null,
  "log": ["Comienza la partida — tu turno. Maná 2/2."]
}
```

`CartaBatalla` = una entrada del pool de §2: `{ id, nombre, rareza, mana, dano, habTipo, habVal, habNombre, glifo }`.

---

## 5. Contrato de API (definitivo — backend y frontend deben coincidir exactamente con esto)

```http
POST   /partida                  (Bearer) → crea partida (valida mazo completo) → estado inicial completo
POST   /partida/:id/jugar        (Bearer) { cartaId: number } → aplica jugada + turno del bot → estado actualizado
POST   /partida/:id/pasar        (Bearer) → pasa turno + turno del bot → estado actualizado
POST   /partida/:id/abandonar    (Bearer) → cierra como abandono → estado final
GET    /partida/:id              (Bearer) → estado actual
```

Respuesta de todos: el objeto `estado` completo (forma de §4) + `id` de la partida + `resultado` (redundante
con `estado.resultado`, pero al nivel superior para que el frontend no tenga que desanidar).

---

## 6. Qué NO hacer (fuera de alcance explícito)

- No hay bot "inteligente" — es `RandomBotStrategy`: elige al azar entre las cartas que puede pagar. Nada de
  IA con API/token externo, nada de heurísticas de dificultad para este sprint.
- No hay múltiples cartas por turno, no hay maná acumulable entre rondas.
- No hay WebSockets/SSE para la partida — todo es request/response síncrono, el turno del bot se resuelve
  en la misma llamada que la jugada del usuario.
- El "delay" de "el bot está pensando" es puramente cosmético en el frontend (~900ms de `setTimeout` antes de
  mostrar el resultado que ya vino en la respuesta) — no hay ningún cómputo real que tarde ese tiempo.
- El mazo de batalla (pool de 12) es fijo y no se relaciona con qué cartas coleccionables tiene el usuario en
  su inventario — el inventario/DeckBuilder solo actúa como gate de acceso ("mazo completo = true/false").
