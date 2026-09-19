const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);
  r.use((req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Apenas administradores' }));

  r.get('/', async (req, res) => {
    res.json(await prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
      orderBy: { nome: 'asc' },
    }));
  });

  r.post('/', async (req, res) => {
    const { nome, email, senha, role } = req.body || {};
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, e-mail e senha obrigatórios' });
    if (String(senha).length < 8) return res.status(400).json({ error: 'Senha precisa de 8+ caracteres' });
    const exists = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (exists) return res.status(400).json({ error: 'E-mail já cadastrado' });
    res.json(await prisma.usuario.create({
      data: { nome, email: email.toLowerCase().trim(), senhaHash: await bcrypt.hash(String(senha), 10), role: role || 'comercial' },
      select: { id: true, nome: true, email: true, role: true },
    }));
  });

  r.put('/:id', async (req, res) => {
    const { nome, role, ativo, senha } = req.body || {};
    const data = { nome, role, ativo };
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    if (senha) data.senhaHash = await bcrypt.hash(String(senha), 10);
    res.json(await prisma.usuario.update({ where: { id: +req.params.id }, data, select: { id: true, nome: true, email: true, role: true, ativo: true } }));
  });

  r.delete('/:id', async (req, res) => {
    if (+req.params.id === req.user.id) return res.status(400).json({ error: 'Você não pode excluir a si mesmo' });
    await prisma.usuario.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  });

  return r;
};
