jest.mock('../repositories/userRepository');

const userRepository = require('../repositories/userRepository');
const rankingService = require('../services/rankingService');

describe('rankingService.js', () => {
  beforeEach(() => jest.clearAllMocks());

  test('debe devolver ranking con posiciones', async () => {
    userRepository.topByPoints.mockResolvedValue([
      { id: 1, username: 'alice', puntos: 100, rachaEjercicios: 5, monedas: 50 },
      { id: 2, username: 'bob', puntos: 80, rachaEjercicios: 3, monedas: 30 },
    ]);

    const result = await rankingService.getRanking(2);

    expect(userRepository.topByPoints).toHaveBeenCalledWith(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].posicion).toBe(1);
    expect(result.items[0].username).toBe('alice');
    expect(result.items[1].posicion).toBe(2);
  });

  test('debe usar límite por defecto 10', async () => {
    userRepository.topByPoints.mockResolvedValue([]);
    await rankingService.getRanking();
    expect(userRepository.topByPoints).toHaveBeenCalledWith(10);
  });
});
