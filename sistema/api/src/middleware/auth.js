const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Sessão expirada' });
  }
  prisma.usuario.findUnique({ where: { id: req.user.id }, select: { id: true, nome: true, email: true, role: true, ativo: true } })
    .then((u) => {
      if (!u || !u.ativo) return res.status(401).json({ error: 'Sessão revogada' });
      req.user = u;
      next();
    })
    .catch(next);
};

module.exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  next();
};
