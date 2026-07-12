require('dotenv').config();
const svc = require('./src/services/emailConfirmationService');
svc.createAndSendConfirmation(0, '20214774@aloe.ulima.edu.pe', 'testuser')
  .then(function(t) { console.log('Token generado:', t); })
  .catch(function(e) { console.error(e); });
