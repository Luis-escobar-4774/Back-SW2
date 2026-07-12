const events = require('../lib/events');
const { EVENTS } = events;

const sseClients = new Map();

function registerClient(usuarioId, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(':\n\n');

  if (!sseClients.has(usuarioId)) {
    sseClients.set(usuarioId, new Set());
  }
  sseClients.get(usuarioId).add(res);

  res.on('close', () => {
    const clients = sseClients.get(usuarioId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(usuarioId);
    }
  });
}

function sendToUser(usuarioId, eventName, data) {
  const clients = sseClients.get(usuarioId);
  if (!clients || clients.size === 0) return;

  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

events.on(EVENTS.CARD_OBTAINED, (payload) => {
  sendToUser(payload.usuarioId, 'CARD_OBTAINED', {
    cartaId: payload.cartaId,
    usuarioCartaId: payload.usuarioCartaId,
    mensaje: 'Obtuviste una nueva carta!',
  });
});

events.on(EVENTS.REWARD_ASSIGNED, (payload) => {
  sendToUser(payload.usuarioId, 'REWARD_ASSIGNED', {
    tipo: payload.tipo,
    cantidad: payload.cantidad,
    mensaje: `+${payload.cantidad} ${payload.tipo.toLowerCase()}`,
  });
});

events.on(EVENTS.EXERCISE_COMPLETED, (payload) => {
  sendToUser(payload.usuarioId, 'EXERCISE_COMPLETED', {
    ejercicioId: payload.ejercicioId,
    correcto: payload.correcto,
  });
});

events.on(EVENTS.GAME_WON, (payload) => {
  sendToUser(payload.usuarioId, 'GAME_WON', {
    partidaId: payload.partidaId,
    puntosGanados: payload.puntosGanados,
  });
});

module.exports = { registerClient, sendToUser };
