const partidaService = require('../services/partidaService');
const prisma = require('../lib/prisma');
const battleEngine = require('../lib/battleEngine');
const partidaRepository = require('../repositories/partidaRepository');
const userRepository = require('../repositories/userRepository');

jest.mock('../lib/prisma', () => ({
  $transaction: jest.fn(),
}));
jest.mock('../lib/battleEngine');
jest.mock('../repositories/partidaRepository');
jest.mock('../repositories/userRepository');

describe('Pruebas de Caja Blanca - partidaService.js (HU 9.2: puntos por victoria)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Camino 1: si el resultado es VICTORIA, incrementa 5 puntos y finaliza la partida
  test('suma 5 puntos al usuario cuando gana una partida', async () => {
    const usuarioId = 15;
    const partida = {
      id: 30,
      usuarioId,
      resultado: null,
      puntosGanados: 0,
      estado: { ronda: 3, resultado: null },
    };
    const estadoVictoria = { ronda: 4, resultado: 'VICTORIA' };
    const tx = { nombre: 'transaccion-simulada' };

    partidaRepository.findById.mockResolvedValue(partida);
    battleEngine.aplicarTurno.mockReturnValue(estadoVictoria);
    prisma.$transaction.mockImplementation(async (operacion) => operacion(tx));
    partidaRepository.finalizar.mockResolvedValue({
      ...partida,
      resultado: 'VICTORIA',
      puntosGanados: 5,
      estado: estadoVictoria,
    });

    const resultado = await partidaService.jugarCarta(usuarioId, partida.id, 8);

    expect(userRepository.updateById).toHaveBeenCalledWith(
      usuarioId,
      { puntos: { increment: 5 } },
      tx,
    );
    expect(partidaRepository.finalizar).toHaveBeenCalledWith(
      partida.id,
      {
        resultado: 'VICTORIA',
        puntosGanados: 5,
        estado: estadoVictoria,
        ronda: 4,
      },
      tx,
    );
    expect(resultado).toEqual({
      id: partida.id,
      resultado: 'VICTORIA',
      puntosGanados: 5,
      estado: estadoVictoria,
    });
  });

  // Camino 2: si el resultado es DERROTA, finaliza la partida sin incrementar puntos
  test('no suma puntos cuando el usuario pierde la partida', async () => {
    const partida = {
      id: 31,
      usuarioId: 15,
      resultado: null,
      puntosGanados: 0,
      estado: { ronda: 3, resultado: null },
    };
    const estadoDerrota = { ronda: 4, resultado: 'DERROTA' };
    partidaRepository.findById.mockResolvedValue(partida);
    battleEngine.aplicarTurno.mockReturnValue(estadoDerrota);
    partidaRepository.finalizar.mockResolvedValue({
      ...partida,
      resultado: 'DERROTA',
      estado: estadoDerrota,
    });

    const resultado = await partidaService.jugarCarta(15, partida.id, 8);

    expect(userRepository.updateById).not.toHaveBeenCalled();
    expect(partidaRepository.finalizar).toHaveBeenCalledWith(partida.id, {
      resultado: 'DERROTA',
      estado: estadoDerrota,
      ronda: 4,
    });
    expect(resultado.resultado).toBe('DERROTA');
  });

  // Camino 3: si la partida continua, actualiza el estado sin sumar puntos ni finalizar
  test('no suma puntos mientras la partida continua', async () => {
    const partida = {
      id: 32,
      usuarioId: 15,
      resultado: null,
      puntosGanados: 0,
      estado: { ronda: 2, resultado: null },
    };
    const estadoEnCurso = { ronda: 3, resultado: null };
    partidaRepository.findById.mockResolvedValue(partida);
    battleEngine.aplicarTurno.mockReturnValue(estadoEnCurso);
    partidaRepository.actualizarEstado.mockResolvedValue({
      ...partida,
      estado: estadoEnCurso,
    });

    const resultado = await partidaService.jugarCarta(15, partida.id, 8);

    expect(userRepository.updateById).not.toHaveBeenCalled();
    expect(partidaRepository.finalizar).not.toHaveBeenCalled();
    expect(partidaRepository.actualizarEstado).toHaveBeenCalledWith(partida.id, estadoEnCurso);
    expect(resultado.resultado).toBeNull();
  });

  // Camino 4: si la partida no existe, devuelve error 404 y no modifica los puntos
  test('lanza error 404 si la partida no existe', async () => {
    partidaRepository.findById.mockResolvedValue(null);

    await expect(partidaService.jugarCarta(15, 999, 8)).rejects.toMatchObject({
      message: 'Partida no encontrada',
      status: 404,
    });
    expect(userRepository.updateById).not.toHaveBeenCalled();
  });
});
