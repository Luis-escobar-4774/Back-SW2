// cardService.test.js
// HU: "Como usuario quiero que mis cartas estén en un inventario virtual, donde pueda
//      visualizar mis cartas de manera organizada" y "quiero observar mana, salud, nivel
//      y daño de cada una directamente en el inventario".
const cardService = require('../services/cardService');
const cardRepository = require('../repositories/cardRepository');

jest.mock('../repositories/cardRepository');

describe('Pruebas de Caja Blanca - cardService.js (Inventario de cartas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtainRandomCard', () => {
    // Camino 1: no hay cartas en el catálogo (rama if (!carta) -> true)
    test('Debe retornar carta y usuarioCarta en null si no existen cartas en el catálogo', async () => {
      cardRepository.findRandom.mockResolvedValue(null);

      const resultado = await cardService.obtainRandomCard('user-1');

      expect(resultado).toEqual({ carta: null, usuarioCarta: null });
      expect(cardRepository.createUserCard).not.toHaveBeenCalled();
    });

    // Camino 2: existe una carta disponible (rama if (!carta) -> false), se agrega al inventario
    test('Debe crear la carta en el inventario del usuario y devolver los datos formateados', async () => {
      cardRepository.findRandom.mockResolvedValue({
        id: 3,
        nombre: 'Mago Arcano',
        rareza: 'RARA',
        imagen: 'mago_arcano.png',
      });
      cardRepository.createUserCard.mockResolvedValue({
        id: 10,
        nivelActual: 1,
        enMazo: false,
      });

      const resultado = await cardService.obtainRandomCard('user-1');

      expect(cardRepository.createUserCard).toHaveBeenCalledWith('user-1', 3, undefined);
      expect(resultado.carta).toEqual({
        id: 3,
        nombre: 'Mago Arcano',
        rareza: 'RARA',
        imagen: 'mago_arcano.png',
      });
      expect(resultado.usuarioCarta).toEqual({ id: 10, nivelActual: 1, enMazo: false });
    });
  });

  describe('listInventory', () => {
    // Camino 3: inventario vacío -> el .map() sobre [] no ejecuta el cuerpo
    test('Debe devolver un arreglo vacío si el usuario no tiene cartas', async () => {
      cardRepository.listInventory.mockResolvedValue([]);

      const resultado = await cardService.listInventory('user-1');

      expect(resultado).toEqual([]);
    });

    // Camino 4: la carta tiene habilidad asignada (rama izquierda de `?.nombre || null`)
    // Verifica que mana, salud, nivel y daño de cada carta queden expuestos en el inventario.
    test('Debe exponer mana, salud, nivel y daño de cada carta junto al nombre de su habilidad', async () => {
      cardRepository.listInventory.mockResolvedValue([
        {
          id: 5,
          nivelActual: 2,
          enMazo: true,
          obtenidaEn: '2026-06-01T20:00:00.000Z',
          carta: {
            id: 3,
            nombre: 'Mago Arcano',
            descripcion: 'Domina los secretos de la magia',
            rareza: 'RARA',
            imagen: 'mago_arcano.png',
            habilidad: { nombre: 'Bola de Fuego' },
            niveles: [
              { nivel: 1, dano: 25, salud: 80, mana: 40 },
              { nivel: 2, dano: 40, salud: 100, mana: 60 },
            ],
          },
        },
      ]);

      const [item] = await cardService.listInventory('user-1');

      expect(item.nivelActual).toBe(2);
      expect(item.carta.habilidad).toBe('Bola de Fuego');
      expect(item.carta.niveles).toEqual([
        { nivel: 1, dano: 25, salud: 80, mana: 40 },
        { nivel: 2, dano: 40, salud: 100, mana: 60 },
      ]);
    });

    // Camino 5: la carta no tiene habilidad (rama derecha de `?.nombre || null`)
    test('Debe devolver habilidad null si la carta no tiene habilidad asignada', async () => {
      cardRepository.listInventory.mockResolvedValue([
        {
          id: 6,
          nivelActual: 1,
          enMazo: false,
          obtenidaEn: '2026-06-02T10:00:00.000Z',
          carta: {
            id: 4,
            nombre: 'Espadachín',
            descripcion: 'Ataca cuerpo a cuerpo',
            rareza: 'COMUN',
            imagen: 'espadachin.png',
            habilidad: null,
            niveles: [{ nivel: 1, dano: 10, salud: 60, mana: 20 }],
          },
        },
      ]);

      const [item] = await cardService.listInventory('user-1');

      expect(item.carta.habilidad).toBeNull();
    });
  });
});
