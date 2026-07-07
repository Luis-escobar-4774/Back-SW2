const { z } = require('zod');

const jugarSchema = z.object({
  cartaId: z.number().int().positive(),
});

module.exports = { jugarSchema };
