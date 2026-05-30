const { PrismaClient } = require('@prisma/client');

const options = {
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
};

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(options);
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(options);
  }
  prisma = global.__prisma;
}

module.exports = prisma;
