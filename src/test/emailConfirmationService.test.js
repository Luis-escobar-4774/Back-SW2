const mockPrisma = {
  user: { update: jest.fn(), findFirst: jest.fn() },
  $disconnect: jest.fn(),
};
jest.mock('../lib/prisma', () => mockPrisma);
jest.mock('../repositories/userRepository');
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));

const prisma = require('../lib/prisma');
const userRepository = require('../repositories/userRepository');
const emailService = require('../services/emailConfirmationService');

describe('emailConfirmationService.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.update.mockResolvedValue({ id: 1 });
    prisma.user.findFirst.mockResolvedValue({ id: 1, email: 'a@b.com', username: 'test' });
  });

  describe('confirmEmail', () => {
    test('debe confirmar el email con token válido', async () => {
      const result = await emailService.confirmEmail('valid-token');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { emailConfirmationToken: 'valid-token', emailConfirmationTokenExpires: { gt: expect.any(Date) } },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { emailConfirmado: true, emailConfirmationToken: null, emailConfirmationTokenExpires: null },
      });
      expect(result.message).toBe('Email confirmado correctamente');
    });

    test('debe lanzar 400 si el token es inválido', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(emailService.confirmEmail('bad-token')).rejects.toThrow('inv\u00e1lido o expirado');
    });
  });

  describe('resendConfirmation', () => {
    test('debe regenerar token si el email no está confirmado', async () => {
      userRepository.findById.mockResolvedValue({ id: 1, email: 'a@b.com', username: 'test', emailConfirmado: false });

      const result = await emailService.resendConfirmation(1);

      expect(result.message).toContain('regenerado');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    test('debe retornar mensaje si ya está confirmado', async () => {
      userRepository.findById.mockResolvedValue({ id: 1, email: 'a@b.com', username: 'test', emailConfirmado: true });

      const result = await emailService.resendConfirmation(1);

      expect(result.message).toBe('Email ya confirmado');
    });

    test('debe lanzar 404 si el usuario no existe', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(emailService.resendConfirmation(999)).rejects.toThrow('User not found');
    });
  });
});
