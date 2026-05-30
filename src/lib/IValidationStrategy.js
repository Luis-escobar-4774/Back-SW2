// src/lib/IValidationStrategy.js
class IValidationStrategy {
  validar({ respuesta, ejercicio }) {
    throw new Error('El método validar() debe ser implementado por cada estrategia');
  }
}

module.exports = IValidationStrategy;
