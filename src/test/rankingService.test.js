const { getRanking } = require('../services/rankingService');
const userRepository = require('../repositories/userRepository');

jest.mock('../repositories/userRepository');

describe('rankingService - Pruebas Esenciales', () => {
  it('Debe retornar la lista de ranking formateada', async () => {
    // Arrange: Simulamos que el repositorio devuelve 2 usuarios
    userRepository.topByPoints.mockResolvedValue([
      { id: 1, username: 'ProUser', puntos: 100 },
      { id: 2, username: 'NewUser', puntos: 50 }
    ]);

    // Act
    const result = await getRanking(2);

    // Assert
    expect(result.items).toHaveLength(2);
    expect(result.items[0].posicion).toBe(1); // Verifica que el servicio asigne la posición
    expect(result.items[0].username).toBe('ProUser');
  });

  it('Debe manejar el caso de ranking vacío', async () => {
    userRepository.topByPoints.mockResolvedValue([]);
    const result = await getRanking(10);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});
