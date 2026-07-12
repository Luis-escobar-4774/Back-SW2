const { Prisma } = require('@prisma/client');
const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const authLib = require('../lib/auth');

jest.mock('../repositories/userRepository');
jest.mock('../lib/auth');
jest.mock('../services/emailConfirmationService', () => ({
  createAndSendConfirmation: jest.fn().mockResolvedValue('token-abc'),
}));

const mockUser = { id: 1, email: 'a@b.com', username: 'testuser', passwordHash: '$2a$10$hash' };

describe('authService.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authLib.hashPassword.mockResolvedValue('hash-123');
    authLib.verifyPassword.mockResolvedValue(true);
    authLib.signToken.mockReturnValue('jwt-token');
    authLib.toPublicUser.mockImplementation((u) => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
  });

  describe('register', () => {
    const input = { email: 'ana@test.com', username: 'ana', password: '12345678' };

    test('debe registrar un usuario nuevo', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);

      const result = await authService.register(input);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(input.email);
      expect(userRepository.findByUsername).toHaveBeenCalledWith(input.username);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.token).toBe('jwt-token');
    });

    test('debe lanzar 409 si el email ya existe', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(input)).rejects.toMatchObject({
        message: 'Email already in use',
        status: 409,
      });
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    test('debe lanzar 409 si el username ya existe', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(mockUser);

      await expect(authService.register(input)).rejects.toMatchObject({
        message: 'Username already in use',
        status: 409,
      });
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    test('debe traducir error P2002 a 409 con el campo duplicado', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['email'] },
      });
      userRepository.create.mockRejectedValue(prismaError);

      await expect(authService.register(input)).rejects.toMatchObject({
        message: 'email already in use',
        status: 409,
      });
    });

    test('debe relanzar errores que no sean P2002', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.create.mockRejectedValue(new Error('DB caída'));

      await expect(authService.register(input)).rejects.toThrow('DB caída');
    });
  });

  describe('login', () => {
    test('debe iniciar sesión con credenciales correctas', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await authService.login({ email: 'a@b.com', password: 'Clave1234' });

      expect(authLib.verifyPassword).toHaveBeenCalledWith('Clave1234', mockUser.passwordHash);
      expect(result.token).toBe('jwt-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    test('debe lanzar 401 si el email no existe', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login({ email: 'x@test.com', password: '123' })).rejects.toMatchObject({
        message: 'Invalid email or password',
        status: 401,
      });
    });

    test('debe lanzar 401 si la contraseña es incorrecta', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      authLib.verifyPassword.mockResolvedValue(false);

      await expect(authService.login({ email: 'a@b.com', password: 'Mala' })).rejects.toMatchObject({
        message: 'Invalid email or password',
        status: 401,
      });
    });
  });

  describe('me', () => {
    test('debe devolver el perfil público del usuario', async () => {
      userRepository.selectPublicById.mockResolvedValue({ id: 1, email: 'a@b.com', username: 'testuser', puntos: 10 });

      const result = await authService.me(1);

      expect(userRepository.selectPublicById).toHaveBeenCalledWith(1);
      expect(result.user.username).toBe('testuser');
    });

    test('debe lanzar 404 si el usuario no existe', async () => {
      userRepository.selectPublicById.mockResolvedValue(null);

      await expect(authService.me(999)).rejects.toThrow('User not found');
    });
  });
});
