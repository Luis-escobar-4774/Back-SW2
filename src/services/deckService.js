const prisma = require('../lib/prisma');
const deckRepository = require('../repositories/deckRepository');

async function getDeck(usuarioId) {
  const items = await deckRepository.findDeck(usuarioId);
  return {
    items: items.map(mapDeckItem),
    total: items.length,
  };
}

async function saveDeck(usuarioId, cartaIds) {
  if (!Array.isArray(cartaIds)) {
    const err = new Error('cartaIds debe ser un arreglo');
    err.status = 400;
    throw err;
  }

  if (cartaIds.length > 12) {
    const err = new Error('El mazo no puede tener más de 12 cartas');
    err.status = 400;
    throw err;
  }

  if (new Set(cartaIds).size !== cartaIds.length) {
    const err = new Error('No se permiten cartas duplicadas en el mazo');
    err.status = 400;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    await deckRepository.clearDeck(usuarioId, tx);

    if (cartaIds.length === 0) return { items: [], total: 0 };

    const owned = await tx.usuarioCarta.findMany({
      where: { id: { in: cartaIds }, usuarioId },
      select: { id: true },
    });

    const ownedIds = new Set(owned.map((c) => c.id));
    const invalid = cartaIds.filter((id) => !ownedIds.has(id));

    if (invalid.length > 0) {
      const err = new Error(`Las siguientes cartas no te pertenecen: ${invalid.join(', ')}`);
      err.status = 400;
      throw err;
    }

    await deckRepository.setCardsInDeck(cartaIds, tx);
  });

  return getDeck(usuarioId);
}

function mapDeckItem(uc) {
  return {
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
  };
}

module.exports = { getDeck, saveDeck };
