// authService.test.js
// Pruebas de Caja Blanca sobre authService.js (registro, login y perfil "me").
// Se cubre cada rama (if/else, try/catch, instanceof) de las 3 funciones exportadas.
const { Prisma } = require('@prisma/client');
const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const authLib = require('../lib/auth');

jest.mock('../repositories/userRepository');
jest.mock('../lib/prisma', () => ({}));
jest.mock('../lib/auth', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  signToken: jest.fn(),
  toPublicUser: jest.fn(),
}));

describe('Pruebas de Caja Blanca - authService.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const input = { email: 'ana@test.com', username: 'ana', password: '12345678' };

    // Camino 1: el email ya existe -> if (existingEmail) => true
    test('Debe lanzar 409 si el email ya está en uso', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'u1' });
      userRepository.findByUsername.mockResolvedValue(null);

      await expect(authService.register(input)).rejects.toMatchObject({
        message: 'Email already in use',
        status: 409,
      });
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    // Camino 2: el username ya existe -> if (existingUsername) => true
    test('Debe lanzar 409 si el username ya está en uso', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue({ id: 'u2' });

      await expect(authService.register(input)).rejects.toMatchObject({
        message: 'Username already in use',
        status: 409,
      });
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    // Camino 3: registro exitoso, ambas validaciones en false
    test('Debe crear el usuario y devolver token si email y username están libres', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      authLib.hashPassword.mockResolvedValue('hash-123');
      userRepository.create.mockResolvedValue({
        id: 'u3',
        email: input.email,
        username: input.username,
        passwordHash: 'hash-123',
      });
      authLib.toPublicUser.mockReturnValue({ id: 'u3', email: input.email, username: input.username });
      authLib.signToken.mockReturnValue('token-abc');

      const resultado = await authService.register(input);

      expect(userRepository.create).toHaveBeenCalledWith({
        email: input.email,
        username: input.username,
        passwordHash: 'hash-123',
      });
      expect(resultado).toEqual({
        user: { id: 'u3', email: input.email, username: input.username },
        token: 'token-abc',
      });
    });

    // Camino 4: la creación falla por carrera (P2002) -> catch la traduce a 409
    test('Debe traducir un error P2002 de Prisma a 409 con el campo duplicado', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      authLib.hashPassword.mockResolvedValue('hash-123');

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
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

    // Camino 5: error desconocido en el catch -> se relanza sin modificar (rama else del instanceof)
    test('Debe relanzar errores que no sean P2002 de Prisma', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      authLib.hashPassword.mockResolvedValue('hash-123');
      userRepository.create.mockRejectedValue(new Error('DB caída'));

      await expect(authService.register(input)).rejects.toThrow('DB caída');
    });
  });

  describe('login', () => {
    // Camino 6: el usuario no existe -> if (!user) => true
    test('Debe lanzar 401 si el usuario no existe', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'x@test.com', password: '123' })
      ).rejects.toMatchObject({ message: 'Invalid email or password', status: 401 });
    });

    // Camino 7: la contraseña es incorrecta -> if (!ok) => true
    test('Debe lanzar 401 si la contraseña es incorrecta', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'u1', passwordHash: 'hash' });
      authLib.verifyPassword.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'x@test.com', password: 'mala' })
      ).rejects.toMatchObject({ message: 'Invalid email or password', status: 401 });
    });

    // Camino 8: login exitoso, ambas condiciones en false
    test('Debe devolver el usuario público y el token si las credenciales son válidas', async () => {
      const userDb = { id: 'u1', email: 'x@test.com', username: 'x', passwordHash: 'hash' };
      userRepository.findByEmail.mockResolvedValue(userDb);
      authLib.verifyPassword.mockResolvedValue(true);
      authLib.toPublicUser.mockReturnValue({ id: 'u1', email: 'x@test.com', username: 'x' });
      authLib.signToken.mockReturnValue('token-xyz');

      const resultado = await authService.login({ email: 'x@test.com', password: 'buena' });

      expect(resultado).toEqual({
        user: { id: 'u1', email: 'x@test.com', username: 'x' },
        token: 'token-xyz',
      });
    });
  });

  describe('me', () => {
    // Camino 9: usuario no encontrado -> if (!user) => true
    test('Debe lanzar 404 si el usuario no existe', async () => {
      userRepository.selectPublicById.mockResolvedValue(null);

      await expect(authService.me('user-inexistente')).rejects.toMatchObject({
        message: 'User not found',
        status: 404,
      });
    });

    // Camino 10: usuario encontrado -> if (!user) => false
    test('Debe devolver el usuario si existe', async () => {
      const user = { id: 'u1', email: 'x@test.com', username: 'x' };
      userRepository.selectPublicById.mockResolvedValue(user);

      const resultado = await authService.me('u1');

      expect(resultado).toEqual({ user });
    });
  });
});
