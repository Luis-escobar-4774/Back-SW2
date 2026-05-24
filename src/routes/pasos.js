const express = require('express');
const prisma = require('../lib/prisma');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// ----------------------------------------------------------------
// POST /pasos/:id/completar -> marca un paso como completado para el usuario
// Idempotente: si ya estaba completado, devuelve el mismo registro.
// ----------------------------------------------------------------
router.post('/:id/completar', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

    const paso = await prisma.paso.findUnique({ where: { id } });
    if (!paso) return res.status(404).json({ error: 'Paso no encontrado' });

    const progreso = await prisma.usuarioPaso.upsert({
      where: { usuarioId_pasoId: { usuarioId: req.user.id, pasoId: id } },
      update: { completado: true, completadoEn: new Date() },
      create: { usuarioId: req.user.id, pasoId: id, completado: true, completadoEn: new Date() },
    });

    res.status(200).json(progreso);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// DELETE /pasos/:id/completar -> desmarca (por si el usuario quiere reiniciar)
// ----------------------------------------------------------------
router.delete('/:id/completar', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

    await prisma.usuarioPaso.deleteMany({
      where: { usuarioId: req.user.id, pasoId: id },
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
