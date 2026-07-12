const { validarRespuesta } = require('../lib/validador');

describe('validador.js', () => {
  describe('tipo output', () => {
    const ejercicio = {
      casosPrueba: [
        { input: '2 3', outputEsperado: '5' },
        { input: '10 20', outputEsperado: '30' },
      ],
    };

    test('debe aceptar si todas las salidas coinciden', () => {
      const result = validarRespuesta({ tipo: 'output', respuesta: '5', ejercicio });
      expect(result.correcto).toBe(true);
      expect(result.motivo).toContain('coincide');
    });

    test('debe rechazar si alguna salida no coincide', () => {
      const result = validarRespuesta({ tipo: 'output', respuesta: '5\n31', ejercicio });
      expect(result.correcto).toBe(false);
      expect(result.motivo).toContain('no coincide');
    });
  });

  describe('tipo codigo', () => {
    const ejercicio = {
      solucionesCodigo: ['function solve(a,b) { return a+b; }', 'const solve = (a,b) => a+b'],
    };

    test('debe aceptar si el código coincide exactamente', () => {
      const result = validarRespuesta({ tipo: 'codigo', respuesta: 'function solve(a,b) { return a+b; }', ejercicio });
      expect(result.correcto).toBe(true);
    });

    test('debe rechazar si el código no coincide', () => {
      const result = validarRespuesta({ tipo: 'codigo', respuesta: 'function solve(a,b) { return a-b; }', ejercicio });
      expect(result.correcto).toBe(false);
    });
  });

  test('debe rechazar tipo desconocido', () => {
    const result = validarRespuesta({ tipo: 'desconocido', respuesta: '', ejercicio: {} });
    expect(result.correcto).toBe(false);
    expect(result.motivo).toContain('desconocido');
  });
});
