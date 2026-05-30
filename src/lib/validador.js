const CodigoValidationStrategy = require('./CodigoValidationStrategy');
const OutputValidationStrategy = require('./OutputValidationStrategy');

const estrategias = {
  codigo: new CodigoValidationStrategy(),
  output: new OutputValidationStrategy(),
};

function validarRespuesta({ tipo, respuesta, ejercicio }) {
  const estrategia = estrategias[tipo];

  if (!estrategia) {
    return { correcto: false, motivo: `Tipo de respuesta desconocido: ${tipo}` };
  }

  return estrategia.validar({ respuesta, ejercicio });
}

module.exports = { validarRespuesta };

