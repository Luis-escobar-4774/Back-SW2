const rewardService = require('./rewardService');

async function processResult(input) {
  return rewardService.applyAttemptOutcome(input);
}

module.exports = { processResult };
