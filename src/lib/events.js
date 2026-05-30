const EventEmitter = require('events');

class AppEmitter extends EventEmitter {}

const EVENTS = {
  EXERCISE_COMPLETED: 'exercise.completed',
  REWARD_ASSIGNED: 'reward.assigned',
  CARD_OBTAINED: 'card.obtained',
  LESSON_COMPLETED: 'lesson.completed',
};

// Singleton-safe emitter: reuse across hot-reloads in development
let emitter;
if (process.env.NODE_ENV === 'production') {
  emitter = new AppEmitter();
} else {
  if (!global.__appEmitter) global.__appEmitter = new AppEmitter();
  emitter = global.__appEmitter;
}

module.exports = emitter;
module.exports.EVENTS = EVENTS;
