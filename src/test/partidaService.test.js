const partidaService = require('../services/partidaService');
const deckRepository = require('../repositories/deckRepository');
const partidaRepository = require('../repositories/partidaRepository');

// Mockeamos 
jest.mock('../repositories/deckRepository');
jest.mock('../repositories/partidaRepository');

describe('Pruebas de Caja Blanca - partidaService.js', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Camino 1: Iniciar partida fracasa porque el mazo está incompleto
  test('iniciarPartida: Debe lanzar error si el mazo no tiene 12 cartas', async () => {
    // Simulamos que la base de datos dice que el usuario solo tiene 5 cartas
    deckRepository.countDeck.mockResolvedValue(5); 

    // Verificamos que entre al if (cantidadEnMazo !== MAZO_COMPLETO)
    await expect(partidaService.iniciarPartida('user-123')).rejects.toThrow(
      'Necesitás tener tu mazo completo (12 cartas) para iniciar una partida' //
    );
  });

  // Camino 2: Iniciar partida es exitoso
  test('iniciarPartida: Debe crear y serializar la partida si el mazo tiene 12 cartas', async () => {
    // Simulamos un mazo completo (12 cartas)
    deckRepository.countDeck.mockResolvedValue(12); 
    
    // Simulamos la respuesta de crear la partida en la DB
    partidaRepository.create.mockResolvedValue({
      id: 'partida-1',
      resultado: null,
      puntosGanados: null,
      estado: {}
    });

    const resultado = await partidaService.iniciarPartida('user-123');
    
    // Afirmamos que el código saltó el error y ejecutó la creación
    expect(partidaRepository.create).toHaveBeenCalled();
    expect(resultado).toHaveProperty('id', 'partida-1');
  });
});