require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ take: 3, select: { id: true, email: true } }).then(function(r) {
  console.log(JSON.stringify(r));
  p.$disconnect();
});
