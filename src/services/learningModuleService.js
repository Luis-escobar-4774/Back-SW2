const moduleRepository = require('../repositories/moduleRepository');
const progressRepository = require('../repositories/progressRepository');

async function listModules(userId = null) {
  const modulos = await moduleRepository.listAll();
  const items = await Promise.all(modulos.map(async (m) => {
    let progreso = null;
    if (userId) {
      const completados = await progressRepository.countCompletedByModule(userId, m.id);
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

  return { items, total: items.length };
}

async function getModule(id, userId = null) {
  const modulo = await moduleRepository.findById(id);
  if (!modulo) {
    const error = new Error('Modulo no encontrado');
    error.status = 404;
    throw error;
  }

  let completados = new Set();
  if (userId) {
    completados = await progressRepository.completedStepIds(userId, modulo.pasos.map((p) => p.id));
  }

  return {
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
      completado: completados.has(p.id),
    })),
  };
}

async function getModuleExercises(id) {
  const modulo = await moduleRepository.findById(id);
  if (!modulo) {
    const error = new Error('Modulo no encontrado');
    error.status = 404;
    throw error;
  }

  const items = await moduleRepository.listExercises(id);
  return {
    modulo: { id: modulo.id, titulo: modulo.titulo },
    items,
    total: items.length,
  };
}

module.exports = { listModules, getModule, getModuleExercises };
