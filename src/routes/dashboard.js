const express = require('express');
const prisma = require('../lib/prisma');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// ----------------------------------------------------------------
// GET /dashboard -> resumen del usuario logueado (HU8, HU9, HU10)
// puntos, monedas, totalCartas, posicionRanking, racha, resueltosCount
// ----------------------------------------------------------------
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        puntos: true,
        monedas: true,
        rachaEjercicios: true,
        tiempoJugadoSeg: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [totalCartas, ejerciciosResueltos, mejorPuntaje, usuariosConMasPuntos] = await Promise.all([
      prisma.usuarioCarta.count({ where: { usuarioId: user.id } }),
      prisma.ejercicioResuelto.count({ where: { usuarioId: user.id, correcto: true } }),
      prisma.user.aggregate({ _max: { puntos: true } }),
      // Posicion ranking = 1 + cantidad de usuarios con MAS puntos que yo
      prisma.user.count({ where: { puntos: { gt: user.puntos } } }),
    ]);

    res.json({
      usuario: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      stats: {
        puntos: user.puntos,
        monedas: user.monedas,
        rachaEjercicios: user.rachaEjercicios,
        tiempoJugadoSeg: user.tiempoJugadoSeg,
        totalCartas,
        ejerciciosResueltos,
      },
      ranking: {
        posicion: usuariosConMasPuntos + 1,
        mejorPuntaje: mejorPuntaje._max.puntos ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// GET /dashboard/ranking -> top N global
// ----------------------------------------------------------------
router.get('/ranking', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const top = await prisma.user.findMany({
      orderBy: [{ puntos: 'desc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true,
        username: true,
        puntos: true,
        rachaEjercicios: true,
      },
    });

    res.json({
      items: top.map((u, i) => ({ posicion: i + 1, ...u })),
      total: top.length,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// GET /dashboard/mis-cartas -> inventario del usuario
// ----------------------------------------------------------------
router.get('/mis-cartas', requireAuth, async (req, res, next) => {
  try {
    const cartas = await prisma.usuarioCarta.findMany({
      where: { usuarioId: req.user.id },
      include: {
        carta: {
          include: { habilidad: true, niveles: { orderBy: { nivel: 'asc' } } },
        },
      },
      orderBy: { obtenidaEn: 'desc' },
    });

    const items = cartas.map((uc) => ({
      id: uc.id,
      nivelActual: uc.nivelActual,
      enMazo: uc.enMazo,
      obtenidaEn: uc.obtenidaEn,
      carta: {
        id: uc.carta.id,
        nombre: uc.carta.nombre,
        descripcion: uc.carta.descripcion,
        rareza: uc.carta.rareza,
        imagen: uc.carta.imagen,
        habilidad: uc.carta.habilidad.nombre,
        niveles: uc.carta.niveles,
      },
    }));

    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
