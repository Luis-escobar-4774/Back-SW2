// deckService.test.js
// HU: "Como usuario quiero que mis cartas estén en un inventario virtual, donde pueda
//      visualizar y GESTIONAR mis cartas de manera organizada" (armar el mazo desde el inventario).
const deckService = require('../services/deckService');
const deckRepository = require('../repositories/deckRepository');
const prisma = require('../lib/prisma');

jest.mock('../repositories/deckRepository');
jest.mock('../lib/prisma', () => ({
  $transaction: jest.fn(),
}));

describe('Pruebas de Caja Blanca - deckService.js (Gestión del mazo desde el inventario)', () => {
  let fakeTx;

  beforeEach(() => {
    jest.clearAllMocks();
    fakeTx = { usuarioCarta: { findMany: jest.fn().mockResolvedValue([]) } };
    prisma.$transaction.mockImplementation((cb) => cb(fakeTx));
  });

  describe('saveDeck - validaciones', () => {
    // Camino 1: cartaIds no es un arreglo (rama if (!Array.isArray(cartaIds)))
    test('Debe lanzar error 400 si cartaIds no es un arreglo', async () => {
      await expect(deckService.saveDeck('user-1', 'no-es-un-array')).rejects.toThrow(
        'cartaIds debe ser un arreglo'
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // Camino 2: el mazo supera las 12 cartas (rama if (cartaIds.length > 12))
    test('Debe lanzar error 400 si el mazo tiene más de 12 cartas', async () => {
      const cartaIds = Array.from({ length: 13 }, (_, i) => i + 1);

      await expect(deckService.saveDeck('user-1', cartaIds)).rejects.toThrow(
        'El mazo no puede tener más de 12 cartas'
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // Camino 3: hay cartas duplicadas (rama if (new Set(cartaIds).size !== cartaIds.length))
    test('Debe lanzar error 400 si hay cartas duplicadas en el mazo', async () => {
      await expect(deckService.saveDeck('user-1', [1, 2, 2])).rejects.toThrow(
        'No se permiten cartas duplicadas en el mazo'
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // Camino 4: alguna carta no pertenece al usuario (rama if (invalid.length > 0))
    test('Debe lanzar error 400 si alguna carta no pertenece al usuario', async () => {
      fakeTx.usuarioCarta.findMany.mockResolvedValue([{ id: 1 }]);

      await expect(deckService.saveDeck('user-1', [1, 2])).rejects.toThrow(
        'Las siguientes cartas no te pertenecen: 2'
      );
      expect(deckRepository.setCardsInDeck).not.toHaveBeenCalled();
    });
  });

  describe('saveDeck - casos exitosos', () => {
    // Camino 5: arreglo vacío -> rama if (cartaIds.length === 0) return; dentro de la transacción,
    // se vacía el mazo sin validar pertenencia de cartas.
    test('Debe vaciar el mazo si cartaIds es un arreglo vacío, sin validar pertenencia', async () => {
      deckRepository.findDeck.mockResolvedValue([]);

      const resultado = await deckService.saveDeck('user-1', []);

      expect(deckRepository.clearDeck).toHaveBeenCalledWith('user-1', fakeTx);
      expect(fakeTx.usuarioCarta.findMany).not.toHaveBeenCalled();
      expect(deckRepository.setCardsInDeck).not.toHaveBeenCalled();
      expect(resultado).toEqual({ items: [], total: 0 });
    });

    // Camino 6: todas las cartas pertenecen al usuario -> rama if (invalid.length > 0) -> false
    test('Debe guardar el mazo cuando todas las cartas pertenecen al usuario', async () => {
      fakeTx.usuarioCarta.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      deckRepository.findDeck.mockResolvedValue([
        {
          id: 1,
          nivelActual: 1,
          enMazo: true,
          obtenidaEn: '2026-06-01',
          carta: {
            id: 1,
            nombre: 'Guerrero',
            descripcion: 'Ataca cuerpo a cuerpo',
            rareza: 'COMUN',
            imagen: 'guerrero.png',
            habilidad: null,
            niveles: [],
          },
        },
      ]);

      const resultado = await deckService.saveDeck('user-1', [1, 2]);

      expect(deckRepository.clearDeck).toHaveBeenCalledWith('user-1', fakeTx);
      expect(deckRepository.setCardsInDeck).toHaveBeenCalledWith([1, 2], fakeTx);
      expect(resultado.total).toBe(1);
      expect(resultado.items[0].carta.habilidad).toBeNull();
    });
  });

  describe('getDeck', () => {
    // Camino 7: expone mana, salud, daño y habilidad de cada carta del mazo (rama izquierda de `?.nombre || null`)
    test('Debe devolver las cartas del mazo con sus niveles (mana, salud, daño) y habilidad', async () => {
      deckRepository.findDeck.mockResolvedValue([
        {
          id: 2,
          nivelActual: 3,
          enMazo: true,
          obtenidaEn: '2026-06-01',
          carta: {
            id: 9,
            nombre: 'Arquero',
            descripcion: 'Ataca a distancia',
            rareza: 'EPICA',
            imagen: 'arquero.png',
            habilidad: { nombre: 'Lluvia de Flechas' },
            niveles: [{ nivel: 3, dano: 55, salud: 90, mana: 45 }],
          },
        },
      ]);

      const resultado = await deckService.getDeck('user-1');

      expect(resultado.total).toBe(1);
      expect(resultado.items[0].carta.habilidad).toBe('Lluvia de Flechas');
      expect(resultado.items[0].carta.niveles).toEqual([
        { nivel: 3, dano: 55, salud: 90, mana: 45 },
      ]);
    });
  });
});
