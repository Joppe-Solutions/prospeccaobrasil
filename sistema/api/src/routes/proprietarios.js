const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const paginate = require('../lib/paginate');

const PROPRIETARIO_FIELDS = [
  'tipoPessoa', 'nome', 'documento', 'telefone', 'email',
  'cidade', 'uf', 'observacoes', 'status',
];

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  const pickProprietario = (body = {}) => {
    const d = {};
    for (const k of PROPRIETARIO_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k)) d[k] = body[k];
    }
    return d;
  };

  r.get('/', asyncHandler(async (req, res) => {
    const { q, status, tipoPessoa } = req.query;
    const where = {};
    if (status) where.status = status;
    if (tipoPessoa) where.tipoPessoa = tipoPessoa;
    if (q) where.OR = [
      { nome: { contains: q } }, { documento: { contains: q } },
      { telefone: { contains: q } }, { email: { contains: q } }, { cidade: { contains: q } },
    ];
    await paginate(req, res, prisma.proprietario, {
      where,
      orderBy: { nome: 'asc' },
      include: { _count: { select: { imoveis: true } } },
    });
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const p = await prisma.proprietario.findUnique({
      where: { id: +req.params.id },
      include: { imoveis: { orderBy: { criadoEm: 'desc' } } },
    });
    if (!p) return res.status(404).json({ error: 'Não encontrado' });
    res.json(p);
  }));

  r.post('/', asyncHandler(async (req, res) => {
    const d = pickProprietario(req.body);
    if (!d.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    if (!d.tipoPessoa) d.tipoPessoa = 'pf';
    if (!d.status) d.status = 'ativo';
    res.json(await prisma.proprietario.create({ data: d }));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    res.json(await prisma.proprietario.update({ where: { id: +req.params.id }, data: pickProprietario(req.body) }));
  }));

  r.delete('/:id', asyncHandler(async (req, res) => {
    await prisma.proprietario.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  }));

  return r;
};
