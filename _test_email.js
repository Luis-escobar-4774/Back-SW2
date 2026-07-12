process.env.NODE_ENV = 'development';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  await prisma.user.deleteMany({ where: { email: { in: ['luisescobar.lfel@gmail.com', 'test@prueba.com'] } } });
  await prisma.user.deleteMany({ where: { username: { in: ['testresend', 'testmailer', 'testnodemailer', 'testnodemailer2'] } } });
  await prisma.$disconnect();

  const app = require('./src/app');
  const server = app.listen(3006, async () => {
    const http = require('http');
    const data = JSON.stringify({ email: 'luisescobar.lfel@gmail.com', username: 'testresend', password: 'Test1234!' });
    const req = http.request({
      hostname: 'localhost', port: 3006, path: '/auth/register', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        console.log('STATUS', res.statusCode);
        const parsed = JSON.parse(body);
        console.log('BODY (truncated)', JSON.stringify(parsed).slice(0, 200));
        if (parsed.user) {
          console.log('EMAIL CONFIRMATION TOKEN:', parsed.user.emailConfirmationToken);
          console.log('Search BODY for "Token" for token');
        }
        server.close();
      });
    });
    req.write(data);
    req.end();
  });
})();
