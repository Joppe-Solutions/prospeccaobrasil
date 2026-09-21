// Setup compartilhado: banco SQLite temporário + app em porta aleatória.
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB = path.join(os.tmpdir(), `pb-api-test-${process.pid}.db`);
process.env.DATABASE_URL = `file:${DB}`;
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.LEAD_RATE_LIMIT = '1000';
process.env.LOGIN_RATE_LIMIT = '1000';

execSync('npx prisma migrate deploy', {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'pipe',
});

const { app, prisma } = require('../src/app');

let server;
let base;

async function seed() {
  const senhaHash = await bcrypt.hash('prospeccao123', 10);
  await prisma.usuario.create({
    data: { nome: 'Admin Teste', email: 'admin@teste.dev', senhaHash, role: 'admin' },
  });
}

async function start() {
  await seed();
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  return base;
}

async function stop() {
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try { fs.unlinkSync(DB + suffix); } catch { /* ignore */ }
  }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

async function login(email = 'admin@teste.dev', senha = 'prospeccao123') {
  const res = await req('POST', '/api/auth/login', { body: { email, senha } });
  return res;
}

module.exports = { app, prisma, start, stop, req, login, getBase: () => base };
