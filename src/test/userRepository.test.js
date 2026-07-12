jest.mock('../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
}));

const prisma = require('../lib/prisma');
const userRepository = require('../repositories/userRepository');

describe('userRepository.js', () => {
  beforeEach(() => jest.clearAllMocks());

  test('create debe llamar a prisma.user.create con los datos', async () => {
    prisma.user.create.mockResolvedValue({ id: 1, email: 'a@b.com' });
    const result = await userRepository.create({ email: 'a@b.com', username: 'test', passwordHash: 'hash' });
    expect(prisma.user.create).toHaveBeenCalledWith({ data: { email: 'a@b.com', username: 'test', passwordHash: 'hash' } });
    expect(result.id).toBe(1);
  });

  test('findByEmail debe buscar por email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'a@b.com' });
    const result = await userRepository.findByEmail('a@b.com');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
    expect(result.email).toBe('a@b.com');
  });

  test('findById debe retornar null si no existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await userRepository.findById(999);
    expect(result).toBeNull();
  });

  test('updateById debe actualizar campos', async () => {
    prisma.user.update.mockResolvedValue({ id: 1, puntos: 20 });
    const result = await userRepository.updateById(1, { puntos: { increment: 10 } });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { puntos: { increment: 10 } } });
    expect(result.puntos).toBe(20);
  });

  test('selectPublicById debe seleccionar solo campos públicos', async () => {
    const publicData = { id: 1, email: 'a@b.com', username: 'test', rol: 'ALUMNO', puntos: 10, monedas: 0, rachaEjercicios: 0, tiempoJugadoSeg: 0, emailConfirmado: true, createdAt: new Date(), updatedAt: new Date() };
    prisma.user.findUnique.mockResolvedValue(publicData);
    const result = await userRepository.selectPublicById(1);
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.emailConfirmado).toBe(true);
  });

  test('topByPoints debe ordenar por puntos descendente', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 1, username: 'top', puntos: 100 }]);
    const result = await userRepository.topByPoints(5);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      orderBy: [{ puntos: 'desc' }, { id: 'asc' }],
      take: 5,
      select: { id: true, username: true, puntos: true, rachaEjercicios: true, monedas: true },
    });
    expect(result).toHaveLength(1);
  });
});
