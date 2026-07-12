const request = require('supertest');
const app = require('../../app');
const { createTestUser, cleanupTestUser, getFirstModule, prisma } = require('./setup');

let testUser;
let firstModule;
let firstStepId;

beforeAll(async () => {
  testUser = await createTestUser();
  firstModule = await getFirstModule();
  if (firstModule && firstModule.pasos && firstModule.pasos.length > 0) {
    firstStepId = firstModule.pasos[0].id;
  } else {
    const paso = await prisma.paso.findFirst({ orderBy: { id: 'asc' } });
    firstStepId = paso ? paso.id : 1;
  }
});

afterAll(async () => {
  await cleanupTestUser();
  await prisma.$disconnect();
});

describe('GET /modulos', () => {
  it('debería listar módulos', async () => {
    const res = await request(app).get('/modulos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('debería incluir progreso si hay token', async () => {
    const res = await request(app)
      .get('/modulos')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    const modulo = res.body.items[0];
    expect(modulo).toHaveProperty('progreso');
  });
});

describe('GET /modulos/:id', () => {
  it('debería devolver detalle del módulo con pasos', async () => {
    const res = await request(app).get(`/modulos/${firstModule.id}`);

    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe(firstModule.titulo);
    expect(res.body).toHaveProperty('pasos');
    expect(Array.isArray(res.body.pasos)).toBe(true);
    expect(res.body.pasos.length).toBeGreaterThanOrEqual(1);
  });

  it('debería marcar pasos completados si hay token', async () => {
    const res = await request(app)
      .get(`/modulos/${firstModule.id}`)
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.pasos[0]).toHaveProperty('completado');
  });

  it('debería devolver 404 para módulo inexistente', async () => {
    const res = await request(app).get('/modulos/99999');
    expect(res.status).toBe(404);
  });
});

describe('GET /modulos/:id/ejercicios', () => {
  it('debería devolver ejercicios del módulo', async () => {
    const res = await request(app).get(`/modulos/${firstModule.id}/ejercicios`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('modulo');
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

describe('POST /pasos/:id/completar', () => {
  it('debería marcar un paso como completado', async () => {
    const res = await request(app)
      .post(`/pasos/${firstStepId}/completar`)
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('completado');
  });

  it('debería rechazar sin autenticación', async () => {
    const res = await request(app).post(`/pasos/${firstStepId}/completar`);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /pasos/:id/completar', () => {
  it('debería descompletar un paso', async () => {
    const res = await request(app)
      .delete(`/pasos/${firstStepId}/completar`)
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(204);
  });
});
