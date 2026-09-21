const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');

module.exports = (prisma) => {
  const r = express.Router();

  r.post('/login', asyncHandler(async (req, res) => {
    const { email, senha } = req.body || {};
    const u = await prisma.usuario.findUnique({ where: { email: String(email || '').toLowerCase().trim() } });
    if (!u || !u.ativo || !(await bcrypt.compare(String(senha || ''), u.senhaHash)))
      return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign({ id: u.id, nome: u.nome, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, usuario: { id: u.id, nome: u.nome, email: u.email, role: u.role } });
  }));

  r.get('/me', auth, asyncHandler(async (req, res) => {
    const u = await prisma.usuario.findUnique({ where: { id: req.user.id }, select: { id: true, nome: true, email: true, role: true } });
    res.json(u);
  }));

  r.post('/trocar-senha', auth, asyncHandler(async (req, res) => {
    const { atual, nova } = req.body || {};
    if (!nova || String(nova).length < 8) return res.status(400).json({ error: 'Nova senha precisa de 8+ caracteres' });
    const u = await prisma.usuario.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(String(atual || ''), u.senhaHash))) return res.status(400).json({ error: 'Senha atual incorreta' });
    await prisma.usuario.update({ where: { id: u.id }, data: { senhaHash: await bcrypt.hash(String(nova), 10) } });
    res.json({ ok: true });
  }));

  return r;
};
