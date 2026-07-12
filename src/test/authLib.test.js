const { hashPassword, verifyPassword, signToken, verifyToken, toPublicUser } = require('../lib/auth');

describe('auth.js (lib)', () => {
  describe('toPublicUser', () => {
    test('debe eliminar passwordHash del objeto', () => {
      const user = { id: 1, email: 'a@b.com', username: 'test', passwordHash: '$2a$10$hash', puntos: 10 };
      const result = toPublicUser(user);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe(1);
      expect(result.puntos).toBe(10);
    });
  });

  describe('signToken / verifyToken', () => {
    beforeAll(() => {
      process.env.JWT_SECRET = 'test-secret-unit';
    });

    test('debe firmar y verificar un token', () => {
      const payload = { sub: 1, email: 'a@b.com', username: 'test' };
      const token = signToken(payload);
      expect(typeof token).toBe('string');
      const decoded = verifyToken(token);
      expect(decoded.sub).toBe(1);
      expect(decoded.email).toBe('a@b.com');
    });

    test('debe lanzar error si JWT_SECRET no está definido', () => {
      delete process.env.JWT_SECRET;
      expect(() => signToken({ sub: 1 })).toThrow('JWT_SECRET is not set');
    });

    test('debe lanzar error con token inválido', () => {
      process.env.JWT_SECRET = 'test-secret-unit';
      expect(() => verifyToken('token-invalido')).toThrow();
    });
  });

  describe('hashPassword / verifyPassword', () => {
    test('debe hashear y verificar contraseña', async () => {
      const hash = await hashPassword('MiClave123');
      expect(hash).not.toBe('MiClave123');
      const ok = await verifyPassword('MiClave123', hash);
      expect(ok).toBe(true);
    });

    test('debe rechazar contraseña incorrecta', async () => {
      const hash = await hashPassword('correcta');
      const ok = await verifyPassword('incorrecta', hash);
      expect(ok).toBe(false);
    });
  });
});
