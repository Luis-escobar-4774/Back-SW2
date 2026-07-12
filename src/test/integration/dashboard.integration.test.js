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

describe('GET /dashboard', () => {
  it('debería devolver stats del usuario', async () => {
    const res = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('usuario');
    expect(res.body).toHaveProperty('stats');
    expect(res.body).toHaveProperty('ranking');
    expect(res.body.usuario.id).toBe(testUser.user.id);
    expect(res.body.stats).toHaveProperty('puntos');
    expect(res.body.stats).toHaveProperty('totalCartas');
    expect(res.body.stats).toHaveProperty('ejerciciosResueltos');
    expect(res.body.ranking).toHaveProperty('posicion');
  });

  it('debería rechazar sin autenticación', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(401);
  });
});

describe('GET /dashboard/ranking', () => {
  it('debería devolver el ranking', async () => {
    const res = await request(app).get('/dashboard/ranking');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('debería respetar el límite', async () => {
    const res = await request(app).get('/dashboard/ranking?limit=3');

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeLessThanOrEqual(3);
  });
});

describe('GET /dashboard/mis-cartas', () => {
  it('debería devolver el inventario del usuario', async () => {
    const res = await request(app)
      .get('/dashboard/mis-cartas')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('debería rechazar sin autenticación', async () => {
    const res = await request(app).get('/dashboard/mis-cartas');
    expect(res.status).toBe(401);
  });
});
