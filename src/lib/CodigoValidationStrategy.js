const IValidationStrategy = require('./IValidationStrategy');

function normalizarCodigo(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/#.*$/gm, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

class CodigoValidationStrategy extends IValidationStrategy {
  validar({ respuesta, ejercicio }) {
    const variaciones = Array.isArray(ejercicio.solucionesCodigo)
      ? ejercicio.solucionesCodigo
      : [];

    const normalizadaUsuario = normalizarCodigo(respuesta);
    const hit = variaciones.some((v) => normalizarCodigo(v) === normalizadaUsuario);

    return {
      correcto: hit,
      motivo: hit
        ? 'Codigo coincide con una solucion aceptada'
        : 'Codigo no coincide con ninguna solucion aceptada',
    };
  }
}

module.exports = CodigoValidationStrategy;
