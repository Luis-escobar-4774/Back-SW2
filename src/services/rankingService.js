const userRepository = require('../repositories/userRepository');

async function getRanking(limit = 10) {
  const top = await userRepository.topByPoints(limit);
  return {
    items: top.map((u, i) => ({ posicion: i + 1, ...u })),
    total: top.length,
  };
}

module.exports = { getRanking };
