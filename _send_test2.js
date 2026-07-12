require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async function() {
  // cambiar email del usuario 3
  await p.user.update({ where: { id: 3 }, data: { email: '20214774@aloe.ulima.edu.pe', username: 'testalumnoul' } });

  const svc = require('./src/services/emailConfirmationService');
  await svc.createAndSendConfirmation(3, '20214774@aloe.ulima.edu.pe', 'testalumnoul');
  console.log('Email enviado!');
  await p.$disconnect();
})();
