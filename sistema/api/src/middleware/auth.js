const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SELECT = { id: true, nome: true, email: true, role: true, ativo: true, senhaAlteradaEm: true };

// Token de sessão (12h) vai só no header Authorization. Para abrir arquivos e relatórios
// em nova aba existe o token de arquivo: curto, só leitura, aceito apenas via ?token=.
const ARQUIVO_TTL = 10 * 60;
const assinarSessao = (u) => jwt.sign({ id: u.id, nome: u.nome, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
const assinarArquivo = (u) => jwt.sign({ id: u.id, uso: 'arquivo' }, process.env.JWT_SECRET, { expiresIn: ARQUIVO_TTL });

// Devolve o usuário ativo dono do token, ou null. Tokens emitidos antes da última
// troca de senha deixam de valer.
async function usuarioDoToken(token, { arquivo = false } = {}) {
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
  if ((payload.uso === 'arquivo') !== arquivo) return null;
  const u = await prisma.usuario.findUnique({ where: { id: payload.id }, select: SELECT });
  if (!u || !u.ativo) return null;
  if (u.senhaAlteradaEm && payload.iat < Math.floor(u.senhaAlteradaEm.getTime() / 1000)) return null;
  const { senhaAlteradaEm, ...usuario } = u;
  return usuario;
}

// Para rotas abertas em nova aba (uploads privados, relatório): header de sessão ou ?token= de arquivo
async function usuarioDaRequisicao(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return usuarioDoToken(h.slice(7));
  return req.query.token ? usuarioDoToken(String(req.query.token), { arquivo: true }) : null;
}

module.exports = function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  usuarioDoToken(token)
    .then((u) => {
      if (!u) return res.status(401).json({ error: 'Sessão expirada' });
      req.user = u;
      next();
    })
    .catch(next);
};

module.exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
};
Object.assign(module.exports, { assinarSessao, assinarArquivo, usuarioDaRequisicao, ARQUIVO_TTL });
