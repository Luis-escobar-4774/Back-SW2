jest.mock('../repositories/userRepository');
jest.mock('../repositories/exerciseRepository');
jest.mock('../lib/events');
jest.mock('../services/cardService');
jest.mock('../services/rewardFactory');

const { applyAttemptOutcome } = require('../services/rewardService');
const userRepository = require('../repositories/userRepository');
const exerciseRepository = require('../repositories/exerciseRepository');
const cardService = require('../services/cardService');

describe('rewardService.js', () => {
  const tx = {};
  const ejercicio = { id: 1, recompensas: [{ tipo: 'PUNTOS', cantidad: 10, probabilidad: 1 }] };

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.updateById.mockResolvedValue({});
    exerciseRepository.markResolved.mockResolvedValue({ count: 1 });
    userRepository.findById.mockResolvedValue({ id: 1, puntos: 10, monedas: 0, rachaEjercicios: 1 });
  });

  test('debe aplicar recompensas si correcto es true', async () => {
    const { RewardFactory } = require('../services/rewardFactory');
    const mockApply = jest.fn().mockResolvedValue({
      rewards: [{ tipo: 'PUNTOS', cantidad: 10 }],
      emittedEvents: [{ name: 'reward.assigned', payload: {} }],
    });
    RewardFactory.create.mockReturnValue({ apply: mockApply });

    const result = await applyAttemptOutcome({ tx, usuarioId: 1, ejercicio, correcto: true, tiempoResolucionSeg: 120 });

    expect(exerciseRepository.markResolved).toHaveBeenCalledWith(1, 1, tx);
    expect(RewardFactory.create).toHaveBeenCalledWith(ejercicio.recompensas[0]);
    expect(mockApply).toHaveBeenCalled();
    expect(result.rewards).toHaveLength(1);
    expect(result.emittedEvents).toHaveLength(1);
  });

  test('debe reiniciar racha si correcto es false', async () => {
    const result = await applyAttemptOutcome({ tx, usuarioId: 1, ejercicio, correcto: false, tiempoResolucionSeg: 60 });

    expect(userRepository.updateById).toHaveBeenCalledWith(1, { rachaEjercicios: 0, tiempoJugadoSeg: { increment: 60 } }, tx);
    expect(result.rewards).toEqual([]);
    expect(result.emittedEvents).toEqual([]);
  });
});
