// Prepara o banco de teste do e2e: migrations + seed mínimo.
// Roda antes do webServer subir (DATABASE_URL=file:./e2e.db → api/prisma/e2e.db).
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../api');
const DB = path.join(API, 'prisma', 'e2e.db');

export default async function globalSetup() {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try { fs.unlinkSync(DB + suffix); } catch { /* ok */ }
  }

  const env = { ...process.env, DATABASE_URL: 'file:./e2e.db' };
  execSync('npx prisma migrate deploy', { cwd: API, env, stdio: 'inherit' });

  const { PrismaClient } = require(path.join(API, 'node_modules', '@prisma', 'client'));
  const bcrypt = require(path.join(API, 'node_modules', 'bcryptjs'));
  const prisma = new PrismaClient({ datasources: { db: { url: 'file:./e2e.db' } } });

  const senhaHash = await bcrypt.hash('prospeccao123', 10);
  await prisma.usuario.create({
    data: { nome: 'Admin E2E', email: 'admin@e2e.dev', senhaHash, role: 'admin' },
  });
  await prisma.empresa.create({ data: { nome: 'Empresa E2E', segmento: 'Varejo' } });
  await prisma.proprietario.create({ data: { nome: 'Proprietário E2E' } });
  await prisma.parceiro.create({ data: { nome: 'Parceiro E2E' } });
  await prisma.lead.create({ data: { nome: 'Lead E2E' } });
  await prisma.lead.create({ data: { nome: 'Lead E2E Conv', telefone: '21955550000', email: 'conv@e2e.dev', interesse: 'Loja E2E' } });
  await prisma.imovel.create({
    data: { titulo: 'Imóvel E2E', codigo: 'PB-E2E', endereco: 'Rua E2E, 1', cidade: 'Rio de Janeiro', uf: 'RJ' },
  });
  await prisma.$disconnect();
}
