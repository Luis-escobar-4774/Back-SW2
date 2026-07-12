const nodemailer = require('nodemailer');
(async () => {
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    tls: { rejectUnauthorized: false },
    auth: { user: 'b1c19f001@smtp-brevo.com', pass: 'xsmtpsib-d9c17c7090448b0ba215e8a60c467501fb1c452cf8187d1ab216f1b4a9afdf75-eKf4KqMHXVWp2vde' },
  });
  try {
    const info = await transporter.sendMail({
      from: '"Cardly" <luisescobar.lfel@gmail.com>',
      to: '20214774@aloe.ulima.edu.pe, luisescobar.lfel@gmail.com, luisishpe24@gmail.com',
      subject: 'Cardly - Confirmación de email',
      text: 'Prueba desde Brevo!',
    });
    console.log('ENVIADO:', info.messageId);
  } catch (err) {
    console.error('ERROR:', err?.message ?? String(err));
  }
})();
