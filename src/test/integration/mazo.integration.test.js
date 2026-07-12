const request = require('supertest');
const app = require('../../app');
const { createTestUser, cleanupTestUser, giveUserCards, prisma } = require('./setup');

let testUser;
let userCards;

beforeAll(async () => {
  testUser = await createTestUser();
  userCards = await giveUserCards(testUser.user.id, 15);
});

afterAll(async () => {
  await cleanupTestUser();
  await prisma.$disconnect();
});

describe('GET /mazo', () => {
  it('debería devolver el mazo del usuario (vacío al inicio)', async () => {
    const res = await request(app)
      .get('/mazo')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
  });

  it('debería rechazar sin autenticación', async () => {
    const res = await request(app).get('/mazo');
    expect(res.status).toBe(401);
  });
});

describe('PUT /mazo', () => {
  it('debería guardar un mazo de 12 cartas', async () => {
    const ids12 = userCards.slice(0, 12).map((c) => c.id);

    const res = await request(app)
      .put('/mazo')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ cartaIds: ids12 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(12);
    expect(res.body.total).toBe(12);
  });

  it('debería rechazar más de 12 cartas', async () => {
    const ids13 = userCards.slice(0, 13).map((c) => c.id);

    const res = await request(app)
      .put('/mazo')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ cartaIds: ids13 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/12/);
  });

  it('debería rechazar duplicados', async () => {
    const id = userCards[0].id;

    const res = await request(app)
      .put('/mazo')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ cartaIds: [id, id, id, id, id, id, id, id, id, id, id, id] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/duplicad/i);
  });

  it('debería rechazar cartas que no pertenecen al usuario', async () => {
    const res = await request(app)
      .put('/mazo')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ cartaIds: [99999, 99998, 99997, 99996, 99995, 99994, 99993, 99992, 99991, 99990, 99989, 99988] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pertenece/i);
  });

  it('debería poder vaciar el mazo', async () => {
    const res = await request(app)
      .put('/mazo')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ cartaIds: [] });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });
});
