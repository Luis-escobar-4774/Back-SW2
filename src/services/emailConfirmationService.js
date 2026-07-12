const crypto = require('crypto');
const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const userRepository = require('../repositories/userRepository');

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      tls: { rejectUnauthorized: false },
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function sendConfirmationEmail(email, username, token) {
  const t = getTransporter();
  const link = FRONTEND_URL + '/confirmar-email?token=' + token;
  const from = process.env.SMTP_FROM ?? 'noreply@cardly.app';

  try {
    await t.sendMail({
      from: '"Cardly" <' + from + '>',
      to: email,
      subject: 'Confirma tu correo electr\u00f3nico - Cardly',
      html: '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">' +
        '<h2 style="color:#6C5CE7;">Bienvenido a Cardly, ' + username + '!</h2>' +
        '<p>Gracias por registrarte. Para empezar a usar tu cuenta, confirma tu correo electr\u00f3nico:</p>' +
        '<p style="text-align:center;margin:32px 0;">' +
        '<a href="' + link + '" style="background:#6C5CE7;color:#fff;padding:14px 32px;' +
        'border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Confirmar Email</a></p>' +
        '<p>O copia este enlace en tu navegador:</p>' +
        '<p style="word-break:break-all;color:#636e72;font-size:13px;">' + link + '</p>' +
        '<p style="color:#b2bec3;font-size:12px;margin-top:24px;">Si no creaste esta cuenta, ignora este mensaje.</p></div>',
      text: 'Confirma tu correo - Cardly\n\nGracias por registrarte, ' + username + '!\n\nAbre este enlace para confirmar tu email:\n' + link,
    });
  } catch (err) {
    console.error('[Email] Error sending confirmation email:', err?.message ?? String(err));
  }
}

async function createAndSendConfirmation(userId, email, username) {
  const token = generateToken();
  const tokenExpires = new Date(Date.now() + TOKEN_EXPIRY_MS);

  await prisma.user.update({
    where: { id: userId },
    data: { emailConfirmationToken: token, emailConfirmationTokenExpires: tokenExpires },
  });

  sendConfirmationEmail(email, username, token).catch((err) =>
    console.error('[Email] Async error:', err?.message ?? String(err))
  );

  return token;
}

async function confirmEmail(token) {
  const user = await prisma.user.findFirst({
    where: {
      emailConfirmationToken: token,
      emailConfirmationTokenExpires: { gt: new Date() },
    },
  });

  if (!user) {
    const error = new Error('Token inv\u00e1lido o expirado');
    error.status = 400;
    throw error;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailConfirmado: true,
      emailConfirmationToken: null,
      emailConfirmationTokenExpires: null,
    },
  });

  return { message: 'Email confirmado correctamente' };
}

async function resendConfirmation(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (user.emailConfirmado) {
    return { message: 'Email ya confirmado' };
  }

  await createAndSendConfirmation(userId, user.email, user.username);

  return { message: 'Token de confirmaci\u00f3n regenerado, revisa tu correo' };
}

module.exports = { createAndSendConfirmation, confirmEmail, resendConfirmation };
