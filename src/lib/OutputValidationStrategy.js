const IValidationStrategy = require('./IValidationStrategy');

function normalizarTexto(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .toLowerCase();
}

class OutputValidationStrategy extends IValidationStrategy {
  validar({ respuesta, ejercicio }) {
    const casos = Array.isArray(ejercicio.casosPrueba) ? ejercicio.casosPrueba : [];
    const esperados = casos.map((c) => normalizarTexto(c.outputEsperado));

    if (Array.isArray(respuesta)) {
      if (respuesta.length !== esperados.length) {
        return {
          correcto: false,
          motivo: `Se esperaban ${esperados.length} outputs, se recibieron ${respuesta.length}`,
        };
      }
      for (let i = 0; i < esperados.length; i++) {
        if (normalizarTexto(respuesta[i]) !== esperados[i]) {
          return { correcto: false, motivo: `Output incorrecto en caso ${i + 1}` };
        }
      }
      return { correcto: true, motivo: 'Todos los outputs coinciden' };
    }

    const u = normalizarTexto(respuesta);
    const hit = esperados.some((e) => e === u);
    return {
      correcto: hit,
      motivo: hit
        ? 'Output coincide con un caso esperado'
        : 'Output no coincide con ningun caso esperado',
    };
  }
}

module.exports = OutputValidationStrategy;
