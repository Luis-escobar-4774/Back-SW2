// Normaliza un string para comparacion tolerante:
// trim, colapsa espacios/saltos, lowercase.
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

// Compara codigo: ignora espacios, saltos de linea y comentarios simples.
function normalizarCodigo(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/#.*$/gm, '')        // comentarios estilo python
    .replace(/\/\/.*$/gm, '')     // comentarios estilo js
    .replace(/\s+/g, '')
    .toLowerCase();
}

// Valida una respuesta del alumno contra un ejercicio.
// Retorna { correcto: boolean, motivo: string }
function validarRespuesta({ tipo, respuesta, ejercicio }) {
  if (tipo === 'codigo') {
    const variaciones = Array.isArray(ejercicio.solucionesCodigo)
      ? ejercicio.solucionesCodigo
      : [];
    const normalizadaUsuario = normalizarCodigo(respuesta);
    const hit = variaciones.some((v) => normalizarCodigo(v) === normalizadaUsuario);
    return {
      correcto: hit,
      motivo: hit ? 'Codigo coincide con una solucion aceptada' : 'Codigo no coincide con ninguna solucion aceptada',
    };
  }

  if (tipo === 'output') {
    // respuesta puede venir como string unico o como array por caso de prueba.
    const casos = Array.isArray(ejercicio.casosPrueba) ? ejercicio.casosPrueba : [];
    const esperados = casos.map((c) => normalizarTexto(c.outputEsperado));

    if (Array.isArray(respuesta)) {
      if (respuesta.length !== esperados.length) {
        return { correcto: false, motivo: `Se esperaban ${esperados.length} outputs, se recibieron ${respuesta.length}` };
      }
      for (let i = 0; i < esperados.length; i++) {
        if (normalizarTexto(respuesta[i]) !== esperados[i]) {
          return { correcto: false, motivo: `Output incorrecto en caso ${i + 1}` };
        }
      }
      return { correcto: true, motivo: 'Todos los outputs coinciden' };
    }

    // Si vino un solo string, lo comparo contra el primer caso (mas tolerante).
    const u = normalizarTexto(respuesta);
    const hit = esperados.some((e) => e === u);
    return {
      correcto: hit,
      motivo: hit ? 'Output coincide con un caso esperado' : 'Output no coincide con ningun caso esperado',
    };
  }

  return { correcto: false, motivo: `tipo de respuesta desconocido: ${tipo}` };
}

module.exports = { validarRespuesta, normalizarTexto, normalizarCodigo };
