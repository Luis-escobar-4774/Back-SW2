const express = require('express');
const prisma = require('../lib/prisma');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// ----------------------------------------------------------------
// GET /modulos -> lista de modulos con info basica
// Si hay token, agrega progreso del usuario (% pasos completados).
// ----------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    // Intento sacar usuario del header si viene token (opcional aqui)
    let userId = null;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const { verifyToken } = require('../lib/auth');
        const payload = verifyToken(auth.slice(7));
        userId = payload.sub;
      } catch (_) { /* token invalido, sigo sin progreso */ }
    }

    const modulos = await prisma.modulo.findMany({
      orderBy: { orden: 'asc' },
      include: {
        pasos: { select: { id: true } },
        ejercicios: { select: { id: true } },
      },
    });

    const items = await Promise.all(modulos.map(async (m) => {
      let progreso = null;
      if (userId) {
        const completados = await prisma.usuarioPaso.count({
          where: { usuarioId: userId, completado: true, paso: { moduloId: m.id } },
        });
        progreso = {
          completados,
          total: m.pasos.length,
          porcentaje: m.pasos.length === 0 ? 0 : Math.round((completados / m.pasos.length) * 100),
        };
      }
      return {
        id: m.id,
        titulo: m.titulo,
        descripcion: m.descripcion,
        orden: m.orden,
        totalPasos: m.pasos.length,
        totalEjercicios: m.ejercicios.length,
        progreso,
      };
    }));

    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// GET /modulos/:id -> detalle con pasos en orden
// Con token: marca cuales estan completados por el usuario.
// ----------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

    let userId = null;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const { verifyToken } = require('../lib/auth');
        const payload = verifyToken(auth.slice(7));
        userId = payload.sub;
      } catch (_) { /* sigue sin progreso */ }
    }

    const modulo = await prisma.modulo.findUnique({
      where: { id },
      include: {
        pasos: { orderBy: { orden: 'asc' } },
      },
    });
    if (!modulo) return res.status(404).json({ error: 'Modulo no encontrado' });

    let completadosPorUsuario = new Set();
    if (userId) {
      const filas = await prisma.usuarioPaso.findMany({
        where: { usuarioId: userId, pasoId: { in: modulo.pasos.map((p) => p.id) }, completado: true },
        select: { pasoId: true },
      });
      completadosPorUsuario = new Set(filas.map((f) => f.pasoId));
    }

    res.json({
      id: modulo.id,
      titulo: modulo.titulo,
      descripcion: modulo.descripcion,
      orden: modulo.orden,
      pasos: modulo.pasos.map((p) => ({
        id: p.id,
        titulo: p.titulo,
        contenidoTextual: p.contenidoTextual,
        video: p.video,
        orden: p.orden,
        completado: completadosPorUsuario.has(p.id),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// GET /modulos/:id/ejercicios -> ejercicios del modulo (HU13)
// ----------------------------------------------------------------
router.get('/:id/ejercicios', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

    const modulo = await prisma.modulo.findUnique({ where: { id } });
    if (!modulo) return res.status(404).json({ error: 'Modulo no encontrado' });

    const ejercicios = await prisma.ejercicio.findMany({
      where: { moduloId: id },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        dificultad: true,
        lenguaje: true,
        tiempoEstimadoSeg: true,
      },
    });

    res.json({
      modulo: { id: modulo.id, titulo: modulo.titulo },
      items: ejercicios,
      total: ejercicios.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
