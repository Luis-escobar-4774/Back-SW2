const request = require('supertest');
const app = require('../../app');
const { createTestUser, cleanupTestUser, prisma } = require('./setup');

let testUser;

beforeAll(async () => {
  testUser = await createTestUser();
});

afterAll(async () => {
  await cleanupTestUser();
  await prisma.$disconnect();
});

describe('POST /auth/register', () => {
  it('debería registrar un usuario nuevo', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: `register_${Date.now()}@test.com`,
        username: `user_${Date.now()}`,
        password: 'SecurePass1!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('email');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('debería rechazar email duplicado', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: testUser.email,
        username: `unique_${Date.now()}`,
        password: 'SecurePass1!',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email/i);
  });

  it('debería rechazar username duplicado', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: `new_${Date.now()}@test.com`,
        username: testUser.username,
        password: 'SecurePass1!',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username/i);
  });

  it('debería rechazar input inválido', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'no-email', username: 'ab', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('details');
  });
});

describe('POST /auth/login', () => {
  it('debería iniciar sesión con credenciales correctas', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('debería rechazar contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('debería rechazar email inexistente', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'whatever' });

    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('debería devolver el usuario autenticado', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(testUser.user.id);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('debería rechazar sin token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('debería rechazar token inválido', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalidtoken123');

    expect(res.status).toBe(401);
  });
});
