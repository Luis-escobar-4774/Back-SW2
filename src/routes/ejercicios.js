const express = require('express');
const { z } = require('zod');

const prisma = require('../lib/prisma');
const requireAuth = require('../middleware/requireAuth');
const { validarRespuesta } = require('../lib/validador');

const router = express.Router();

// Lo que se muestra al alumno (sin solucionesCodigo, para no spoilear)
function ejercicioPublico(e) {
  if (!e) return null;
  const { solucionesCodigo, ...rest } = e;
  return rest;
}

// ----------------------------------------------------------------
// GET /ejercicios
// Lista de ejercicios. Filtros: ?moduloId=, ?dificultad=, ?lenguaje=
// ----------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.moduloId) where.moduloId = Number(req.query.moduloId);
    if (req.query.dificultad) where.dificultad = String(req.query.dificultad).toUpperCase();
    if (req.query.lenguaje) where.lenguaje = String(req.query.lenguaje).toLowerCase();

    const items = await prisma.ejercicio.findMany({
      where,
      orderBy: { id: 'asc' },
    });
    res.json({ items: items.map(ejercicioPublico), total: items.length });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// GET /ejercicios/activos -> pendientes del usuario logueado (top 5)
// ----------------------------------------------------------------
router.get('/activos', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.ejercicioActivo.findMany({
      where: { usuarioId: req.user.id, estado: 'PENDIENTE' },
      include: { ejercicio: true },
      orderBy: { fechaAsignacion: 'desc' },
      take: 5,
    });

    const result = items.map((a) => ({
      id: a.id,
      estado: a.estado,
      fechaAsignacion: a.fechaAsignacion,
      ejercicio: {
        id: a.ejercicio.id,
        titulo: a.ejercicio.titulo,
        dificultad: a.ejercicio.dificultad,
        lenguaje: a.ejercicio.lenguaje,
      },
    }));

    res.json({ items: result, total: result.length });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// POST /ejercicios/activos -> asignar un ejercicio al usuario logueado
// Body: { ejercicioId }
// Si ya estaba asignado, lo devuelve sin duplicar.
// ----------------------------------------------------------------
const asignarSchema = z.object({
  ejercicioId: z.number().int().positive(),
});

router.post('/activos', requireAuth, async (req, res, next) => {
  const parsed = asignarSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const ejercicio = await prisma.ejercicio.findUnique({ where: { id: parsed.data.ejercicioId } });
    if (!ejercicio) return res.status(404).json({ error: 'Ejercicio no encontrado' });

    const activo = await prisma.ejercicioActivo.upsert({
      where: {
        usuarioId_ejercicioId: { usuarioId: req.user.id, ejercicioId: ejercicio.id },
      },
      update: {},
      create: { usuarioId: req.user.id, ejercicioId: ejercicio.id },
      include: { ejercicio: true },
    });

    res.status(201).json({
      id: activo.id,
      estado: activo.estado,
      fechaAsignacion: activo.fechaAsignacion,
      ejercicio: ejercicioPublico(activo.ejercicio),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// GET /ejercicios/:id -> detalle (con casos de prueba, sin solucionesCodigo)
// ----------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

    const ejercicio = await prisma.ejercicio.findUnique({
      where: { id },
      include: {
        modulo: { select: { id: true, titulo: true } },
        recompensas: true,
      },
    });
    if (!ejercicio) return res.status(404).json({ error: 'Ejercicio no encontrado' });

    res.json(ejercicioPublico(ejercicio));
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// POST /ejercicios/:id/submit -> el alumno envia su respuesta
// Body: { tipo: 'codigo'|'output', respuesta: string|string[], tiempoResolucionSeg: int }
// ----------------------------------------------------------------
const submitSchema = z.object({
  tipo: z.enum(['codigo', 'output']),
  respuesta: z.union([z.string(), z.array(z.string())]),
  tiempoResolucionSeg: z.number().int().nonnegative(),
});

router.post('/:id/submit', requireAuth, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }

  const { tipo, respuesta, tiempoResolucionSeg } = parsed.data;

  try {
    const ejercicio = await prisma.ejercicio.findUnique({
      where: { id },
      include: { recompensas: true },
    });
    if (!ejercicio) return res.status(404).json({ error: 'Ejercicio no encontrado' });

    const { correcto, motivo } = validarRespuesta({ tipo, respuesta, ejercicio });

    // Guarda el intento siempre (correcto o no)
    const respuestaStr = Array.isArray(respuesta) ? JSON.stringify(respuesta) : respuesta;

    const recompensasOtorgadas = [];
    let cartaOtorgada = null;
    let puntosAcumulados = 0;
    let monedasAcumuladas = 0;

    const result = await prisma.$transaction(async (tx) => {
      const intento = await tx.ejercicioResuelto.create({
        data: {
          ejercicioId: ejercicio.id,
          usuarioId: req.user.id,
          tiempoResolucionSeg,
          correcto,
          tipoRespuesta: tipo,
          respuesta: respuestaStr,
        },
      });

      // Si correcto: marcar activo como resuelto (si existe) y otorgar recompensas.
      if (correcto) {
        await tx.ejercicioActivo.updateMany({
          where: { usuarioId: req.user.id, ejercicioId: ejercicio.id, estado: 'PENDIENTE' },
          data: { estado: 'RESUELTO' },
        });

        // Procesar cada recompensa segun probabilidad
        for (const r of ejercicio.recompensas) {
          const prob = Number(r.probabilidad); // Decimal viene como string en JS
          if (Math.random() > prob) continue;

          if (r.tipo === 'PUNTOS') {
            puntosAcumulados += r.cantidad;
            recompensasOtorgadas.push({ tipo: 'PUNTOS', cantidad: r.cantidad });
          } else if (r.tipo === 'MONEDAS') {
            monedasAcumuladas += r.cantidad;
            recompensasOtorgadas.push({ tipo: 'MONEDAS', cantidad: r.cantidad });
          } else if (r.tipo === 'CARTA') {
            // Carta aleatoria del catalogo
            const totalCartas = await tx.carta.count();
            if (totalCartas > 0) {
              const skip = Math.floor(Math.random() * totalCartas);
              const cartaAleatoria = await tx.carta.findFirst({ skip, orderBy: { id: 'asc' } });
              if (cartaAleatoria) {
                const uc = await tx.usuarioCarta.create({
                  data: { usuarioId: req.user.id, cartaId: cartaAleatoria.id },
                  include: { carta: true },
                });
                cartaOtorgada = {
                  id: uc.carta.id,
                  nombre: uc.carta.nombre,
                  rareza: uc.carta.rareza,
                  imagen: uc.carta.imagen,
                };
                recompensasOtorgadas.push({ tipo: 'CARTA', carta: cartaOtorgada });
              }
            }
          }
        }

        // Actualizar stats del usuario (puntos, monedas, racha)
        if (puntosAcumulados > 0 || monedasAcumuladas > 0 || correcto) {
          await tx.user.update({
            where: { id: req.user.id },
            data: {
              puntos: { increment: puntosAcumulados },
              monedas: { increment: monedasAcumuladas },
              rachaEjercicios: { increment: 1 },
              tiempoJugadoSeg: { increment: tiempoResolucionSeg },
            },
          });
        }
      } else {
        // Romper racha en intento incorrecto
        await tx.user.update({
          where: { id: req.user.id },
          data: {
            rachaEjercicios: 0,
            tiempoJugadoSeg: { increment: tiempoResolucionSeg },
          },
        });
      }

      const usuarioActualizado = await tx.user.findUnique({ where: { id: req.user.id } });
      return { intento, usuarioActualizado };
    });

    res.status(correcto ? 200 : 200).json({
      correcto,
      motivo,
      tiempoResolucionSeg,
      recompensas: recompensasOtorgadas,
      puntosActuales: result.usuarioActualizado.puntos,
      monedasActuales: result.usuarioActualizado.monedas,
      rachaEjercicios: result.usuarioActualizado.rachaEjercicios,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
