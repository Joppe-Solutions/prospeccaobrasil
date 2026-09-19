const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');

const LEAD_FIELDS = [
  'nome', 'telefone', 'email', 'origem', 'interesse', 'status', 'observacoes',
];

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  const pickLead = (body = {}) => {
    const d = {};
    for (const k of LEAD_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k)) d[k] = body[k];
    }
    return d;
  };

  r.get('/', asyncHandler(async (req, res) => {
    const { q, status, origem } = req.query;
    const where = {};
    if (status) where.status = status;
    if (origem) where.origem = origem;
    if (q) where.OR = [
      { nome: { contains: q } }, { telefone: { contains: q } },
      { email: { contains: q } }, { interesse: { contains: q } },
    ];
    res.json(await prisma.lead.findMany({ where, orderBy: { criadoEm: 'desc' } }));
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: +req.params.id } });
    if (!lead) return res.status(404).json({ error: 'Não encontrado' });
    res.json(lead);
  }));

  r.post('/', asyncHandler(async (req, res) => {
    const d = pickLead(req.body);
    if (!d.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    if (!d.origem) d.origem = 'site';
    if (!d.status) d.status = 'novo';
    res.json(await prisma.lead.create({ data: d }));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    res.json(await prisma.lead.update({ where: { id: +req.params.id }, data: pickLead(req.body) }));
  }));

  r.delete('/:id', asyncHandler(async (req, res) => {
    await prisma.lead.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  }));

  return r;
};
