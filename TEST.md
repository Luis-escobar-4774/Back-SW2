# Documentación de pruebas unitarias

## Resumen
Este proyecto usa Jest para realizar pruebas unitarias en el backend. Los archivos de prueba se encuentran en la carpeta `src/test` y tienen la extensión `*.test.js`.

## Ejecutar pruebas
Desde la carpeta `Back-SW2` ejecuta:

```bash
npm test
```

El script `test` está configurado en `package.json` como:

```json
"test": "jest"
```

## Estructura de la carpeta de pruebas
- `src/test/` - carpeta principal de pruebas unitarias.
- `battleEngine.test.js` - pruebas de la lógica del motor de batalla.
- `partidaService.test.js` - pruebas de la lógica del servicio de partidas con repositorios mockeados.
- `cardService.test.js` - pruebas del inventario virtual de cartas.
- `deckService.test.js` - pruebas de la gestión del mazo (armar/organizar el inventario).

## Qué se prueba
### `battleEngine.test.js`
- Verifica el flujo de juego dentro de `src/lib/battleEngine.js`.
- Comprueba que se lance un error si el jugador intenta jugar cuando no es su turno.
- Comprueba que se lance un error si la carta no está en la mano del jugador.
- Comprueba que el pase de turno se procese correctamente cuando se usa `null` como carta.
- Comprueba que se detecte la victoria si la salud del bot llega a cero.

### `partidaService.test.js`
- Verifica los casos del servicio `src/services/partidaService.js`.
- Usa `jest.mock()` para simular `../repositories/deckRepository` y `../repositories/partidaRepository`.
- Valida que se arroje un error si el mazo no tiene 12 cartas.
- Valida que se cree la partida cuando el mazo cumple la condición.

### `cardService.test.js` — HU: inventario virtual de cartas
Cubre las historias de usuario:
> Como usuario, quiero que mis cartas estén almacenadas en un inventario virtual, donde pueda visualizar y gestionar mis cartas de manera organizada.
> Como usuario quiero observar mana, salud, nivel y daño de cada una directamente en el inventario.

Prueba `src/services/cardService.js` con `../repositories/cardRepository` mockeado (`jest.mock()`). Caminos cubiertos (caja blanca, cada rama del código):

| # | Camino / rama | Resultado esperado |
|---|---|---|
| 1 | `obtainRandomCard` — no hay cartas en el catálogo (`if (!carta)` → true) | Devuelve `{ carta: null, usuarioCarta: null }` y no crea nada en el inventario |
| 2 | `obtainRandomCard` — hay carta disponible (`if (!carta)` → false) | Se crea el registro en `Usuario_Carta` y se devuelve la carta formateada |
| 3 | `listInventory` — inventario vacío | Devuelve `[]` |
| 4 | `listInventory` — carta con habilidad asignada (rama izquierda de `?.nombre \|\| null`) | El item expone `nombre` de la habilidad y el arreglo `niveles` con `dano`, `salud`, `mana` por nivel |
| 5 | `listInventory` — carta sin habilidad (rama derecha de `?.nombre \|\| null`) | `habilidad` se devuelve como `null` |

### `deckService.test.js` — HU: gestión organizada del inventario (mazo)
Cubre la parte de "gestionar mis cartas de manera organizada" (armar el mazo desde el inventario).

Prueba `src/services/deckService.js` con `../repositories/deckRepository` y `../lib/prisma` mockeados (se simula `prisma.$transaction` invocando el callback con un `tx` falso). Caminos cubiertos:

| # | Camino / rama | Resultado esperado |
|---|---|---|
| 1 | `saveDeck` — `cartaIds` no es un arreglo | Error 400 `cartaIds debe ser un arreglo` |
| 2 | `saveDeck` — más de 12 cartas | Error 400 `El mazo no puede tener más de 12 cartas` |
| 3 | `saveDeck` — cartas duplicadas | Error 400 `No se permiten cartas duplicadas en el mazo` |
| 4 | `saveDeck` — alguna carta no pertenece al usuario | Error 400 `Las siguientes cartas no te pertenecen: <id>` y no se llama `setCardsInDeck` |
| 5 | `saveDeck` — arreglo vacío (`if (cartaIds.length === 0)` → true, dentro de la transacción) | Se vacía el mazo (`clearDeck`) sin validar pertenencia ni llamar `setCardsInDeck` |
| 6 | `saveDeck` — todas las cartas pertenecen al usuario (`if (invalid.length > 0)` → false) | Se llama `clearDeck` + `setCardsInDeck` y se devuelve el mazo actualizado |
| 7 | `getDeck` — mapeo de cartas del mazo | Expone `nombre` de la habilidad, y `niveles` con `dano`, `salud`, `mana` por carta |

## Cobertura
Se verificó cobertura de ramas (branch coverage) 100% en `cardService.js` y `deckService.js`:

```bash
npx jest --coverage --collectCoverageFrom="src/services/cardService.js" --collectCoverageFrom="src/services/deckService.js"
```

```
File            | % Stmts | % Branch | % Funcs | % Lines
cardService.js  |     100 |      100 |     100 |     100
deckService.js  |     100 |      100 |     100 |     100
```

## Notas
- Si agregas más pruebas, mantenlas organizadas en `src/test` para que el comando `npm test` las detecte automáticamente.
- `jest` se instaló como dependencia de desarrollo con `npm install --save-dev jest` (ya estaba declarado en `package.json`, la instalación solo aseguró `node_modules`).
