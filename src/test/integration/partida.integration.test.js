const request = require('supertest');
const app = require('../../app');
const { createTestUser, cleanupTestUser, giveUserCards, prisma } = require('./setup');

let testUser;
let userCards;

beforeAll(async () => {
  testUser = await createTestUser();
  userCards = await giveUserCards(testUser.user.id, 15);
  const ids12 = userCards.slice(0, 12).map((c) => c.id);
  await request(app)
    .put('/mazo')
    .set('Authorization', `Bearer ${testUser.token}`)
    .send({ cartaIds: ids12 });
}, 30000);

afterAll(async () => {
  await cleanupTestUser();
  await prisma.$disconnect();
});

describe('POST /partida', () => {
  it('debería iniciar una partida con mazo completo', async () => {
    const res = await request(app)
      .post('/partida')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('estado');
    expect(res.body.resultado).toBeNull();
  });

  it('debería rechazar sin autenticación', async () => {
    const res = await request(app).post('/partida');
    expect(res.status).toBe(401);
  });
});

describe('GET /partida/:id', () => {
  let partidaId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/partida')
      .set('Authorization', `Bearer ${testUser.token}`);
    partidaId = res.body.id;
  });

  it('debería devolver la partida', async () => {
    const res = await request(app)
      .get(`/partida/${partidaId}`)
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(partidaId);
    expect(res.body).toHaveProperty('estado');
  });

  it('debería devolver 404 para partida inexistente', async () => {
    const res = await request(app)
      .get('/partida/99999')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /partida/:id/jugar y /pasar', () => {
  let partidaId;
  let estado;

  beforeAll(async () => {
    const res = await request(app)
      .post('/partida')
      .set('Authorization', `Bearer ${testUser.token}`);
    partidaId = res.body.id;
    estado = res.body.estado;
  });

  it('debería jugar una carta válida de la mano', async () => {
    const cartaJugable = estado.jugador.mano.find((c) => c.mana <= estado.jugador.mana)
      ?? estado.jugador.mano.sort((a, b) => a.mana - b.mana)[0];
    const cartaId = cartaJugable.id;

    const res = await request(app)
      .post(`/partida/${partidaId}/jugar`)
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ cartaId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('estado');
    expect(res.body).toHaveProperty('id');
  });

  it('debería pasar turno', async () => {
    const res = await request(app)
      .post(`/partida/${partidaId}/pasar`)
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('estado');
  });

  it('debería rechazar carta que no está en la mano', async () => {
    const res = await request(app)
      .post(`/partida/${partidaId}/jugar`)
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ cartaId: 99999 });

    expect(res.status).toBe(400);
  });
});

describe('POST /partida/:id/abandonar', () => {
  let partidaId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/partida')
      .set('Authorization', `Bearer ${testUser.token}`);
    partidaId = res.body.id;
  });

  it('debería abandonar la partida', async () => {
    const res = await request(app)
      .post(`/partida/${partidaId}/abandonar`)
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.resultado).toBe('ABANDONO');
  });

  it('debería rechazar abandonar una partida ya finalizada', async () => {
    const res = await request(app)
      .post(`/partida/${partidaId}/abandonar`)
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(409);
  });
});
