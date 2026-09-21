require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

// Segurança e performance
app.disable('x-powered-by');
app.use(compression());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d', immutable: true }));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d' }));

// Rate limit simples no login (10 tentativas / 5 min por IP)
const attempts = new Map();
app.use('/api/auth/login', (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const rec = attempts.get(ip) || { n: 0, reset: now + 5 * 60 * 1000 };
  if (now > rec.reset) { rec.n = 0; rec.reset = now + 5 * 60 * 1000; }
  rec.n++;
  attempts.set(ip, rec);
  const max = Number(process.env.LOGIN_RATE_LIMIT || 10);
  if (rec.n > max) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 5 minutos.' });
  next();
});

app.use('/api/auth', require('./routes/auth')(prisma));
app.use('/api/empresas', require('./routes/empresas')(prisma));
app.use('/api/leads', require('./routes/leads')(prisma));
app.use('/api/proprietarios', require('./routes/proprietarios')(prisma));
app.use('/api/parceiros', require('./routes/parceiros')(prisma));
app.use('/api/imoveis', require('./routes/imoveis')(prisma));
app.use('/api/oportunidades', require('./routes/oportunidades')(prisma));
app.use('/api/financeiro', require('./routes/financeiro')(prisma));
app.use('/api/dashboard', require('./routes/dashboard')(prisma));
app.use('/api/usuarios', require('./routes/usuarios')(prisma));
app.use('/api/public', require('./routes/public')(prisma));
app.use('/apresentacao', require('./routes/apresentacao')(prisma));

app.get('/api/healthz', (req, res) => res.json({ ok: true }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError || (err && /não permitido|File too large|Unexpected field/i.test(err.message || ''))) {
    return res.status(400).json({ error: err.message || 'Upload inválido' });
  }
  res.status(500).json({ error: 'Erro interno' });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e));

module.exports = { app, prisma };
