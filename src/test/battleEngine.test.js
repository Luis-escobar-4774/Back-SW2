// battleEngine.test.js
const { aplicarTurno, crearEstadoInicial } = require('../lib/battleEngine');

describe('Pruebas de Caja Blanca - battleEngine.js', () => {
  
  // Camino 1: El jugador intenta jugar cuando no es su turno (Prueba de Excepción)
  test('Debe lanzar error 403 si no es turno del usuario', () => {
    const estado = crearEstadoInicial();
    estado.turno = 'bot'; // Forzamos la variable interna para entrar al 'if'

    // Verificamos que pase por la rama: if (estadoActual.turno !== 'usuario')
    expect(() => aplicarTurno(estado, 1)).toThrow('No es tu turno');
  });

  // Camino 2: El jugador intenta jugar una carta que no está en su mano (Prueba de Excepción)
  test('Debe lanzar error 400 si la carta no está en la mano', () => {
    const estado = crearEstadoInicial();
    
    // Verificamos que pase por la rama: if (idx === -1)
    expect(() => aplicarTurno(estado, 999)).toThrow('La carta no está en tu mano');
  });

  // Camino 3: El jugador pasa el turno (Prueba de rama 'else' en esPase)
  test('Debe permitir pasar el turno si cartaId es null', () => {
    const estado = crearEstadoInicial();
    const nuevoEstado = aplicarTurno(estado, null); // cartaIdOPass = null
    
    // Verificamos el resultado del bloque 'else' (esPase)
    expect(nuevoEstado.ultimaJugadaJugador.paso).toBe(true);
    expect(nuevoEstado.log).toContain('Pasaste el turno (sin maná suficiente).');
  });

  // Camino 4: Chequeo de victoria inmediata (Prueba de rama de victoria)
  test('Debe retornar VICTORIA si la salud del bot cae a 0', () => {
    const estado = crearEstadoInicial();
    estado.bot.salud = 2; // Le dejamos muy poca vida al bot
    
    // Le damos una carta de daño al jugador en su mano
    estado.jugador.mano = [{ id: 1, mana: 1, dano: 5, habTipo: 'dano' }];
    estado.jugador.mana = 10; 
    
    const nuevoEstado = aplicarTurno(estado, 1);
    
    // Verificamos que entre en: if (estado.bot.salud <= 0)
    expect(nuevoEstado.resultado).toBe('VICTORIA');
  });
});