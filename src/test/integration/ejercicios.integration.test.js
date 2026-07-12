const request = require('supertest');
const app = require('../../app');
const { createTestUser, cleanupTestUser, getFirstExercise, prisma } = require('./setup');

let testUser;
let firstExercise;

beforeAll(async () => {
  testUser = await createTestUser();
  firstExercise = await getFirstExercise();
});

afterAll(async () => {
  await cleanupTestUser();
  await prisma.$disconnect();
});

describe('GET /ejercicios', () => {
  it('debería listar ejercicios', async () => {
    const res = await request(app).get('/ejercicios');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('debería filtrar por dificultad', async () => {
    const res = await request(app).get('/ejercicios?dificultad=FACIL');

    expect(res.status).toBe(200);
    res.body.items.forEach((e) => {
      expect(e.dificultad).toBe('FACIL');
    });
  });

  it('debería filtrar por lenguaje', async () => {
    const res = await request(app).get('/ejercicios?lenguaje=python');

    expect(res.status).toBe(200);
    res.body.items.forEach((e) => {
      expect(e.lenguaje).toBe('python');
    });
  });
});

describe('GET /ejercicios/:id', () => {
  it('debería devolver el detalle de un ejercicio', async () => {
    const res = await request(app).get(`/ejercicios/${firstExercise.id}`);

    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe(firstExercise.titulo);
    expect(res.body).toHaveProperty('descripcion');
    expect(res.body).toHaveProperty('dificultad');
    expect(res.body).toHaveProperty('casosPrueba');
    expect(res.body).not.toHaveProperty('solucionesCodigo');
  });

  it('debería devolver 404 para id inexistente', async () => {
    const res = await request(app).get('/ejercicios/99999');
    expect(res.status).toBe(404);
  });

  it('debería rechazar id inválido', async () => {
    const res = await request(app).get('/ejercicios/abc');
    expect(res.status).toBe(400);
  });
});

describe('POST /ejercicios/activos', () => {
  it('debería asignar un ejercicio al usuario', async () => {
    const res = await request(app)
      .post('/ejercicios/activos')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ ejercicioId: firstExercise.id });

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('PENDIENTE');
    expect(res.body.ejercicio.id).toBe(firstExercise.id);
  });

  it('debería rechazar sin autenticación', async () => {
    const res = await request(app)
      .post('/ejercicios/activos')
      .send({ ejercicioId: firstExercise.id });

    expect(res.status).toBe(401);
  });
});

describe('GET /ejercicios/activos', () => {
  it('debería devolver los ejercicios activos del usuario', async () => {
    const res = await request(app)
      .get('/ejercicios/activos')
      .set('Authorization', `Bearer ${testUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /ejercicios/:id/submit', () => {
  it('debería aceptar respuesta correcta (tipo output)', async () => {
    const res = await request(app)
      .post(`/ejercicios/${firstExercise.id}/submit`)
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        tipo: 'output',
        respuesta: '5',
        tiempoResolucionSeg: 120,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('correcto');
    expect(res.body).toHaveProperty('puntosActuales');
    expect(res.body).toHaveProperty('recompensas');
  });

  it('debería aceptar respuesta correcta (tipo código)', async () => {
    const res = await request(app)
      .post(`/ejercicios/${firstExercise.id}/submit`)
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        tipo: 'codigo',
        respuesta: 'a = int(input())\nb = int(input())\nprint(a + b)',
        tiempoResolucionSeg: 60,
      });

    expect(res.status).toBe(200);
    expect(res.body.correcto).toBe(true);
  });

  it('debería rechazar respuesta incorrecta', async () => {
    const res = await request(app)
      .post(`/ejercicios/${firstExercise.id}/submit`)
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        tipo: 'output',
        respuesta: 'wrong_answer',
        tiempoResolucionSeg: 30,
      });

    expect(res.status).toBe(200);
    expect(res.body.correcto).toBe(false);
    expect(res.body).toHaveProperty('solucionEjemplo');
  });

  it('debería rechazar sin autenticación', async () => {
    const res = await request(app)
      .post(`/ejercicios/${firstExercise.id}/submit`)
      .send({ tipo: 'output', respuesta: '5', tiempoResolucionSeg: 10 });

    expect(res.status).toBe(401);
  });
});
