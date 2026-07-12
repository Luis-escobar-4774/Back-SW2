const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

let testUserId = 0;
let testUserEmail = '';
let testUserToken = '';

function uniqueSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function createTestUser() {
  const suffix = uniqueSuffix();
  testUserEmail = `test_${suffix}@example.com`;
  const username = `test_${suffix}`;
  const password = 'Test1234!';

  const passwordHash = await bcrypt.hash(password, 1);
  const user = await prisma.user.create({
    data: {
      email: testUserEmail,
      username,
      passwordHash,
    },
  });

  testUserId = user.id;

  const { signToken } = require('../../lib/auth');
  testUserToken = signToken({ sub: user.id, email: user.email, username: user.username });

  return { user, token: testUserToken, email: testUserEmail, password, username };
}

async function cleanupTestUser() {
  if (!testUserId) return;
  try {
    await prisma.usuarioPaso.deleteMany({ where: { usuarioId: testUserId } });
    await prisma.usuarioCarta.deleteMany({ where: { usuarioId: testUserId } });
    await prisma.ejercicioResuelto.deleteMany({ where: { usuarioId: testUserId } });
    await prisma.ejercicioActivo.deleteMany({ where: { usuarioId: testUserId } });
    await prisma.partida.deleteMany({ where: { usuarioId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  } catch (_) {}
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function getFirstExercise() {
  return prisma.ejercicio.findFirst({ orderBy: { id: 'asc' } });
}

async function getFirstModule() {
  return prisma.modulo.findFirst({
    orderBy: { id: 'asc' },
    include: { pasos: { orderBy: { id: 'asc' }, take: 1 } },
  });
}

async function getFirstCard() {
  return prisma.carta.findFirst({ orderBy: { id: 'asc' } });
}

async function giveUserCards(userId, count) {
  const cards = await prisma.carta.findMany({ take: count, orderBy: { id: 'asc' } });
  const created = [];
  for (const card of cards) {
    const uc = await prisma.usuarioCarta.create({
      data: { usuarioId: userId, cartaId: card.id },
    });
    created.push(uc);
  }
  return created;
}

async function setUserPoints(userId, points) {
  return prisma.user.update({ where: { id: userId }, data: { puntos: points } });
}

module.exports = {
  prisma,
  createTestUser,
  cleanupTestUser,
  authHeader,
  getFirstExercise,
  getFirstModule,
  getFirstCard,
  giveUserCards,
  setUserPoints,
  get testUserId() { return testUserId; },
  get testUserToken() { return testUserToken; },
};
