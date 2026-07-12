const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
(async () => {
  try {
    const result = await resend.emails.send({
      from: 'Cardly <onboarding@resend.dev>',
      to: ['luisishpe24@gmail.com'],
      subject: 'Prueba directa - Cardly',
      html: '<p>Si ves esto, Resend funciona!</p>',
    });
    console.log('SUCCESS', JSON.stringify(result));
  } catch (err) {
    console.error('ERROR', err?.message ?? String(err));
    console.error('FULL', JSON.stringify(err));
  }
})();
