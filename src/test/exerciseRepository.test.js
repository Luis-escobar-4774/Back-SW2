jest.mock('../lib/prisma', () => ({
  ejercicio: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  ejercicioActivo: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  ejercicioResuelto: {
    create: jest.fn(),
    count: jest.fn(),
  },
}));

const prisma = require('../lib/prisma');
const exerciseRepository = require('../repositories/exerciseRepository');

describe('exerciseRepository.js', () => {
  beforeEach(() => jest.clearAllMocks());

  test('list debe retornar ejercicios', async () => {
    prisma.ejercicio.findMany.mockResolvedValue([{ id: 1, titulo: 'Test' }]);
    const result = await exerciseRepository.list({ dificultad: 'FACIL' });
    expect(prisma.ejercicio.findMany).toHaveBeenCalledWith({ where: { dificultad: 'FACIL' }, orderBy: { id: 'asc' } });
    expect(result).toHaveLength(1);
  });

  test('findById debe incluir modulo y recompensas', async () => {
    prisma.ejercicio.findUnique.mockResolvedValue({ id: 1, titulo: 'Test' });
    const result = await exerciseRepository.findById(1);
    expect(prisma.ejercicio.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { modulo: { select: { id: true, titulo: true } }, recompensas: true },
    });
    expect(result.id).toBe(1);
  });

  test('findById debe retornar null si no existe', async () => {
    prisma.ejercicio.findUnique.mockResolvedValue(null);
    const result = await exerciseRepository.findById(999);
    expect(result).toBeNull();
  });

  test('upsertActive debe crear o actualizar ejercicio activo', async () => {
    prisma.ejercicioActivo.upsert.mockResolvedValue({ id: 1, estado: 'PENDIENTE', ejercicio: { id: 1, titulo: 'Test' } });
    const result = await exerciseRepository.upsertActive(1, 1);
    expect(prisma.ejercicioActivo.upsert).toHaveBeenCalled();
    expect(result.estado).toBe('PENDIENTE');
  });
});
