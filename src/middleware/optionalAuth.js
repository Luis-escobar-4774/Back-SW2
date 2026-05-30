const { verifyToken } = require('../lib/auth');

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next();
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, username: payload.username };
  } catch (_) {
    // Token inválido: seguimos sin usuario, como comportamiento opcional.
  }

  return next();
}

module.exports = optionalAuth;
