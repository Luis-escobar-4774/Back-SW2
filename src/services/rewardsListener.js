const events = require('../lib/events');
const { EVENTS } = events;

events.on(EVENTS.EXERCISE_COMPLETED, (payload) => {
  console.log('[events] exercise.completed', {
    usuarioId: payload.usuarioId,
    ejercicioId: payload.ejercicioId,
    correcto: payload.correcto,
    tiempoResolucionSeg: payload.tiempoResolucionSeg,
  });
});

events.on(EVENTS.REWARD_ASSIGNED, (payload) => {
  console.log('[events] reward.assigned', payload);
});

events.on(EVENTS.CARD_OBTAINED, (payload) => {
  console.log('[events] card.obtained', payload);
});

events.on(EVENTS.LESSON_COMPLETED, (payload) => {
  console.log('[events] lesson.completed', payload);
});

module.exports = events;
