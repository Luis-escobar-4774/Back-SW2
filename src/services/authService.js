const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { hashPassword, verifyPassword, signToken, toPublicUser } = require('../lib/auth');
const userRepository = require('../repositories/userRepository');
const { createAndSendConfirmation } = require('./emailConfirmationService');

function tokenFor(user) {
  return signToken({ sub: user.id, email: user.email, username: user.username });
}

async function register({ email, username, password }) {
  try {
    const [existingEmail, existingUsername] = await Promise.all([
      userRepository.findByEmail(email),
      userRepository.findByUsername(username),
    ]);

    if (existingEmail) {
      const error = new Error('Email already in use');
      error.status = 409;
      throw error;
    }

    if (existingUsername) {
      const error = new Error('Username already in use');
      error.status = 409;
      throw error;
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({ email, username, passwordHash });

    createAndSendConfirmation(user.id, user.email, user.username).catch(() => {});

    return { user: toPublicUser(user), token: tokenFor(user) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      const error = new Error(`${target} already in use`);
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  return { user: toPublicUser(user), token: tokenFor(user) };
}

async function me(userId) {
  const user = await userRepository.selectPublicById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return { user };
}

module.exports = { register, login, me };
