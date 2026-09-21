const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');

const LEAD_FIELDS = [
  'nome', 'telefone', 'email', 'origem', 'interesse', 'status', 'observacoes',
];
const LEAD_STATUS = new Set(['novo', 'em_contato', 'qualificado', 'convertido', 'perdido']);
const LEAD_ORIGENS = new Set(['site', 'anuncio', 'indicacao', 'outro']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  const pickLead = (body = {}) => {
    const d = {};
    for (const k of LEAD_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k)) d[k] = body[k];
    }
    if (d.nome !== undefined) d.nome = String(d.nome || '').trim();
    if (d.email !== undefined) d.email = String(d.email || '').trim().toLowerCase() || null;
    if (d.telefone !== undefined) d.telefone = String(d.telefone || '').trim() || null;
    return d;
  };

  const valida = (d) => {
    if (d.status !== undefined && !LEAD_STATUS.has(d.status)) return 'Status inválido';
    if (d.origem !== undefined && d.origem && !LEAD_ORIGENS.has(d.origem)) return 'Origem inválida';
    if (d.email) return EMAIL_RE.test(d.email) ? null : 'E-mail inválido';
    return null;
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
    const erro = valida(d);
    if (erro) return res.status(400).json({ error: erro });
    if (!d.origem) d.origem = 'site';
    if (!d.status) d.status = 'novo';
    res.json(await prisma.lead.create({ data: d }));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    const d = pickLead(req.body);
    if (d.nome !== undefined && !d.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    const erro = valida(d);
    if (erro) return res.status(400).json({ error: erro });
    const lead = await prisma.lead.findUnique({ where: { id: +req.params.id } });
    if (!lead) return res.status(404).json({ error: 'Não encontrado' });
    res.json(await prisma.lead.update({ where: { id: lead.id }, data: d }));
  }));

  // Conversão: lead → empresa (+ oportunidade opcional), transacional e idempotente
  r.post('/:id/converter', asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: +req.params.id } });
    if (!lead) return res.status(404).json({ error: 'Não encontrado' });
    if (lead.status === 'convertido') {
      return res.status(409).json({ error: 'Lead já convertido' });
    }
    const { empresaId, empresaNome, imovelId, observacao } = req.body || {};
    if (!empresaId && !empresaNome && !lead.nome) {
      return res.status(400).json({ error: 'Informe a empresa (existente ou nome para criar)' });
    }
    const resultado = await prisma.$transaction(async (tx) => {
      const empresa = empresaId
        ? await tx.empresa.findUnique({ where: { id: +empresaId } })
        : await tx.empresa.create({ data: { nome: empresaNome || lead.nome } });
      if (!empresa) throw Object.assign(new Error('Empresa não encontrada'), { status: 404 });
      let oportunidade = null;
      if (imovelId) {
        oportunidade = await tx.oportunidade.create({
          data: { imovelId: +imovelId, empresaId: empresa.id, observacao },
        });
      }
      const atualizado = await tx.lead.update({ where: { id: lead.id }, data: { status: 'convertido' } });
      return { lead: atualizado, empresa, oportunidade };
    });
    res.json(resultado);
  }));

  r.delete('/:id', asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: +req.params.id } });
    if (!lead) return res.status(404).json({ error: 'Não encontrado' });
    await prisma.lead.delete({ where: { id: lead.id } });
    res.json({ ok: true });
  }));

  return r;
};
