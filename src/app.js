const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const prisma = require('./lib/prisma');
require('./services/rewardsListener');

const authRoutes = require('./routes/auth');
const ejerciciosRoutes = require('./routes/ejercicios');
const dashboardRoutes = require('./routes/dashboard');
const modulosRoutes = require('./routes/modulos');
const pasosRoutes = require('./routes/pasos');
const mazoRoutes = require('./routes/mazo');
const partidaRoutes = require('./routes/partida');
const realtimeRoutes = require('./routes/realtime');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} no permitido`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({ name: 'Back-SW2', status: 'ok' });
});

app.get('/health', async (_req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT 1 AS ok`;
    res.json({ status: 'ok', db: 'up', result });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'down', error: err.message });
  }
});

app.use('/auth', authRoutes);
app.use('/ejercicios', ejerciciosRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/modulos', modulosRoutes);
app.use('/pasos', pasosRoutes);
app.use('/mazo', mazoRoutes);
app.use('/partida', partidaRoutes);
app.use('/realtime', realtimeRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, _req, res, _next) => {
  console.error('[Back-SW2] unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
