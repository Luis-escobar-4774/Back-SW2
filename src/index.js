require('dotenv').config();

const prisma = require('./lib/prisma');
const app = require('./app');

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`[Back-SW2] listening on http://localhost:${PORT}`);
});

const shutdown = async (signal) => {
  console.log(`\n[Back-SW2] received ${signal}, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
