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


## Notas
- Si agregas más pruebas, mantenlas organizadas en `src/test` para que el comando `npm test` las detecte automáticamente.
