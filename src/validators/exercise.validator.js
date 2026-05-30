const { z } = require('zod');

const assignSchema = z.object({
  ejercicioId: z.number().int().positive(),
});

const submitSchema = z.object({
  tipo: z.enum(['codigo', 'output']),
  respuesta: z.union([z.string(), z.array(z.string())]),
  tiempoResolucionSeg: z.number().int().nonnegative(),
});

module.exports = { assignSchema, submitSchema };
