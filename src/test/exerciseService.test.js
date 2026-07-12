const exerciseService = require('../services/exerciseService');
const prisma = require('../lib/prisma');
const events = require('../lib/events');
const { validarRespuesta } = require('../lib/validador');
const exerciseRepository = require('../repositories/exerciseRepository');
const rewardService = require('../services/rewardService');

jest.mock('../lib/prisma', () => ({
  $transaction: jest.fn(),
}));
jest.mock('../lib/events', () => ({
  emit: jest.fn(),
  EVENTS: {
    EXERCISE_COMPLETED: 'exercise.completed',
    CARD_OBTAINED: 'card.obtained',
  },
}));
jest.mock('../lib/validador');
jest.mock('../repositories/exerciseRepository');
jest.mock('../services/rewardService');

describe('Pruebas de Caja Blanca - exerciseService.js (HU 3.7.RT: actualizacion del inventario)', () => {
  const tx = { nombre: 'transaccion-simulada' };
  const entradaBase = {
    usuarioId: 15,
    ejercicioId: 7,
    tipo: 'codigo',
    respuesta: 'print("Cardly")',
    tiempoResolucionSeg: 40,
  };
  const ejercicio = {
    id: 7,
    solucionesCodigo: ['print("Cardly")'],
    recompensas: [{ tipo: 'CARTA', probabilidad: 1, cantidad: 1 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (operacion) => operacion(tx));
  });

  function prepararIntentoExitoso({ correcto = true, rewards = [] } = {}) {
    exerciseRepository.findByIdWithRewards.mockResolvedValue(ejercicio);
    validarRespuesta.mockReturnValue({ correcto, motivo: correcto ? 'Correcto' : 'Incorrecto' });
    exerciseRepository.createResolvedAttempt.mockResolvedValue({ id: 101 });
    rewardService.applyAttemptOutcome.mockResolvedValue({
      rewards,
      emittedEvents: rewards.length > 0
        ? [{ name: 'card.obtained', payload: { usuarioId: 15, cartaId: 20 } }]
        : [],
      usuario: { puntos: 10, monedas: 2, rachaEjercicios: correcto ? 1 : 0 },
    });
  }

  // Camino 1: si el ejercicio no existe, termina con error 404 y no abre una transaccion
  test('lanza error 404 cuando el ejercicio no existe', async () => {
    exerciseRepository.findByIdWithRewards.mockResolvedValue(null);

    await expect(exerciseService.submitAttempt(entradaBase)).rejects.toMatchObject({
      message: 'Ejercicio no encontrado',
      status: 404,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // Camino 2: si la respuesta es correcta, devuelve la carta y emite su actualizacion
  test('devuelve y notifica la nueva carta cuando la respuesta es correcta', async () => {
    const carta = { tipo: 'CARTA', carta: { id: 20, nombre: 'Mago Arcano' } };
    prepararIntentoExitoso({ rewards: [carta] });

    const resultado = await exerciseService.submitAttempt(entradaBase);

    expect(resultado.correcto).toBe(true);
    expect(resultado.recompensas).toEqual([carta]);
    expect(events.emit).toHaveBeenCalledWith('card.obtained', {
      usuarioId: 15,
      cartaId: 20,
    });
  });

  // Camino 3: si la respuesta es incorrecta, no recibe carta y obtiene una solucion de ejemplo
  test('no entrega cartas y muestra una solucion cuando la respuesta es incorrecta', async () => {
    prepararIntentoExitoso({ correcto: false });

    const resultado = await exerciseService.submitAttempt({
      ...entradaBase,
      respuesta: 'print("respuesta incorrecta")',
    });

    expect(resultado.correcto).toBe(false);
    expect(resultado.recompensas).toEqual([]);
    expect(resultado.solucionEjemplo).toBe('print("Cardly")');
    expect(events.emit).not.toHaveBeenCalledWith('card.obtained', expect.anything());
  });

  // Camino 4: si la respuesta es un arreglo, la serializa antes de guardar el intento
  test('serializa una respuesta de tipo arreglo antes de persistirla', async () => {
    prepararIntentoExitoso();
    const respuesta = ['linea 1', 'linea 2'];

    await exerciseService.submitAttempt({ ...entradaBase, tipo: 'output', respuesta });

    expect(exerciseRepository.createResolvedAttempt).toHaveBeenCalledWith({
      ejercicioId: 7,
      usuarioId: 15,
      tiempoResolucionSeg: 40,
      correcto: true,
      tipoRespuesta: 'output',
      respuesta: JSON.stringify(respuesta),
    }, tx);
  });
});
