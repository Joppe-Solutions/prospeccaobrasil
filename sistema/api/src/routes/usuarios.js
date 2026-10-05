const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');

const ROLES = ['admin', 'comercial'];

module.exports = (prisma) => {
  const r = express.Router();
  // Nunca deixar o sistema sem um administrador ativo
  const outroAdminAtivo = (id) => prisma.usuario.count({ where: { role: 'admin', ativo: true, id: { not: id } } });
  r.use(auth);
  r.use((req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Apenas administradores' }));

  r.get('/', asyncHandler(async (req, res) => {
    res.json(await prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
      orderBy: { nome: 'asc' },
    }));
  }));

  r.post('/', asyncHandler(async (req, res) => {
    const { nome, email, senha, role } = req.body || {};
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, e-mail e senha obrigatórios' });
    if (String(senha).length < 8) return res.status(400).json({ error: 'Senha precisa de 8+ caracteres' });
    if (role !== undefined && !ROLES.includes(role)) return res.status(400).json({ error: 'Perfil inválido' });
    if (typeof nome !== 'string' || !nome.trim() || typeof email !== 'string') return res.status(400).json({ error: 'Nome e e-mail inválidos' });
    const exists = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (exists) return res.status(400).json({ error: 'E-mail já cadastrado' });
    res.json(await prisma.usuario.create({
      data: { nome: nome.trim(), email: email.toLowerCase().trim(), senhaHash: await bcrypt.hash(String(senha), 10), role: role || 'comercial' },
      select: { id: true, nome: true, email: true, role: true },
    }));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    const id = +req.params.id;
    const { nome, role, ativo, senha } = req.body || {};
    const data = { nome, role, ativo };
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    if (data.nome !== undefined && (typeof data.nome !== 'string' || !data.nome.trim())) return res.status(400).json({ error: 'Nome inválido' });
    if (data.role !== undefined && !ROLES.includes(data.role)) return res.status(400).json({ error: 'Perfil inválido' });
    if (data.ativo !== undefined && typeof data.ativo !== 'boolean') return res.status(400).json({ error: 'Situação inválida' });
    const atual = await prisma.usuario.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ error: 'Usuário não encontrado' });
    const perdeAdmin = atual.role === 'admin' && atual.ativo && ((data.role && data.role !== 'admin') || data.ativo === false);
    if (perdeAdmin && id === req.user.id) return res.status(400).json({ error: 'Você não pode remover o próprio acesso de administrador' });
    if (perdeAdmin && !(await outroAdminAtivo(id))) return res.status(400).json({ error: 'O sistema precisa de ao menos um administrador ativo' });
    if (senha !== undefined) {
      if (String(senha).length < 8) return res.status(400).json({ error: 'Senha precisa de 8+ caracteres' });
      data.senhaHash = await bcrypt.hash(String(senha), 10);
      data.senhaAlteradaEm = new Date(); // redefinição pelo admin derruba as sessões do usuário
    }
    res.json(await prisma.usuario.update({ where: { id }, data, select: { id: true, nome: true, email: true, role: true, ativo: true } }));
  }));

  r.delete('/:id', asyncHandler(async (req, res) => {
    if (+req.params.id === req.user.id) return res.status(400).json({ error: 'Você não pode excluir a si mesmo' });
    const alvo = await prisma.usuario.findUnique({ where: { id: +req.params.id } });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (alvo.role === 'admin' && alvo.ativo && !(await outroAdminAtivo(alvo.id))) return res.status(400).json({ error: 'O sistema precisa de ao menos um administrador ativo' });
    await prisma.usuario.delete({ where: { id: alvo.id } });
    res.json({ ok: true });
  }));

  return r;
};
