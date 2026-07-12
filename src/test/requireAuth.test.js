jest.mock('../lib/auth');

const requireAuth = require('../middleware/requireAuth');
const auth = require('../lib/auth');

function mockReqRes(authorization) {
  const req = { headers: { authorization } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
}

describe('requireAuth middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  test('debe llamar next() si el token es válido', () => {
    auth.verifyToken.mockReturnValue({ sub: 1, email: 'a@b.com', username: 'test' });
    const { req, res, next } = mockReqRes('Bearer valid-token');

    requireAuth(req, res, next);

    expect(auth.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(req.user).toEqual({ id: 1, email: 'a@b.com', username: 'test' });
    expect(next).toHaveBeenCalled();
  });

  test('debe responder 401 si falta header', () => {
    const { req, res, next } = mockReqRes('');

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  test('debe responder 401 si el esquema no es Bearer', () => {
    const { req, res, next } = mockReqRes('Basic token');

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('debe responder 401 si el token es inválido', () => {
    auth.verifyToken.mockImplementation(() => { throw new Error('jwt malformed'); });
    const { req, res, next } = mockReqRes('Bearer bad-token');

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });
});
