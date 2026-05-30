const cardRepository = require('../repositories/cardRepository');

async function obtainRandomCard(usuarioId, client) {
  const carta = await cardRepository.findRandom(client);
  if (!carta) return { carta: null, usuarioCarta: null };

  const usuarioCarta = await cardRepository.createUserCard(usuarioId, carta.id, client);
  return {
    carta: {
      id: carta.id,
      nombre: carta.nombre,
      rareza: carta.rareza,
      imagen: carta.imagen,
    },
    usuarioCarta,
  };
}

async function listInventory(usuarioId, client) {
  const inventory = await cardRepository.listInventory(usuarioId, client);
  return inventory.map((uc) => ({
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
      habilidad: uc.carta.habilidad?.nombre || null,
      niveles: uc.carta.niveles,
    },
  }));
}

module.exports = { obtainRandomCard, listInventory };
