const { detalle, submit } = require('../controllers/ejerciciosController');
const exerciseService = require('../services/exerciseService');

jest.mock('../services/exerciseService');

describe('ejerciciosController - Pruebas Esenciales', () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: {}, body: {}, user: { id: 1 } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // Prueba de HU 8.5 (Detalle)
  it('Debe retornar el detalle del ejercicio', async () => {
    req.params.id = '1';
    exerciseService.getById.mockResolvedValue({ id: 1, titulo: 'Test' });
    
    await detalle(req, res, next);
    
    expect(res.json).toHaveBeenCalled();
  });

  // Prueba de Caja Blanca/Negra (Submit)
  it('Debe procesar correctamente un intento de ejercicio', async () => {
    req.params.id = '1';
    req.body = { tipo: 'codigo', respuesta: 'print(1)', tiempoResolucionSeg: 10 };
    exerciseService.submitAttempt.mockResolvedValue({ correcto: true });
    
    await submit(req, res, next);
    
    expect(res.json).toHaveBeenCalledWith({ correcto: true });
  });

  // Prueba de Caja Blanca (Manejo de errores/Caminos alternos)
  it('Debe retornar 400 si el ID es inválido', async () => {
    req.params.id = 'abc';
    await detalle(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
