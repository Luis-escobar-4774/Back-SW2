const { RewardFactory, PointsReward, CoinsReward, CardReward, NullReward } = require('../services/rewardFactory');

describe('rewardFactory.js (Factory Method)', () => {
  test('RewardFactory.create debe devolver PointsReward para tipo PUNTOS', () => {
    const reward = RewardFactory.create({ tipo: 'PUNTOS', cantidad: 10, probabilidad: 1 });
    expect(reward).toBeInstanceOf(PointsReward);
  });

  test('RewardFactory.create debe devolver CoinsReward para tipo MONEDAS', () => {
    const reward = RewardFactory.create({ tipo: 'MONEDAS', cantidad: 5, probabilidad: 1 });
    expect(reward).toBeInstanceOf(CoinsReward);
  });

  test('RewardFactory.create debe devolver CardReward para tipo CARTA', () => {
    const reward = RewardFactory.create({ tipo: 'CARTA', probabilidad: 0.5 });
    expect(reward).toBeInstanceOf(CardReward);
  });

  test('RewardFactory.create debe devolver NullReward para tipo desconocido', () => {
    const reward = RewardFactory.create({ tipo: 'INEXISTENTE' });
    expect(reward).toBeInstanceOf(NullReward);
  });

  test('NullReward.apply debe devolver arrays vacíos', async () => {
    const reward = new NullReward();
    const result = await reward.apply({ tx: {}, usuarioId: 1, ejercicio: { id: 1 } });
    expect(result).toEqual({ rewards: [], emittedEvents: [] });
  });
});
