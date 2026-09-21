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
    const lead = await prisma.lead.findUnique({
      where: { id: +req.params.id },
      include: { interacoes: { orderBy: { criadoEm: 'desc' } } },
    });
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
    // "convertido" só via POST /:id/converter — status sozinho não é prova de conversão
    if (d.status === 'convertido' && !lead.empresaId) {
      return res.status(400).json({ error: 'Use a ação "Converter" para vincular empresa/oportunidade' });
    }
    // Remover o vínculo exige conversão nova, não apenas mudança de status
    delete d.empresaId; delete d.oportunidadeId;
    res.json(await prisma.lead.update({ where: { id: lead.id }, data: d }));
  }));

  // Conversão: lead → empresa (+ oportunidade opcional), transacional e idempotente.
  // O vínculo persiste em lead.empresaId/oportunidadeId — reconversão retorna o existente.
  r.post('/:id/converter', asyncHandler(async (req, res) => {
    const { empresaId, empresaNome, imovelId, observacao } = req.body || {};
    if (empresaId !== undefined && !Number.isInteger(+empresaId)) {
      return res.status(400).json({ error: 'empresaId inválido' });
    }
    if (imovelId !== undefined && imovelId !== null && !Number.isInteger(+imovelId)) {
      return res.status(400).json({ error: 'imovelId inválido' });
    }
    const resultado = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: +req.params.id }, include: { empresa: true, oportunidade: true } });
      if (!lead) throw Object.assign(new Error('Lead não encontrado'), { status: 404 });
      // Idempotência: já convertido retorna o vínculo existente, sem duplicar
      if (lead.empresaId) {
        return { lead, empresa: lead.empresa, oportunidade: lead.oportunidade, jaConvertido: true };
      }
      let empresa;
      if (empresaId) {
        empresa = await tx.empresa.findUnique({ where: { id: +empresaId } });
        if (!empresa) throw Object.assign(new Error('Empresa não encontrada'), { status: 404 });
      } else {
        const nomeEmpresa = String(empresaNome || lead.nome).trim();
        if (!nomeEmpresa) throw Object.assign(new Error('Informe a empresa (existente ou nome para criar)'), { status: 400 });
        empresa = await tx.empresa.create({
          data: {
            nome: nomeEmpresa,
            telefone: lead.telefone || null,
            email: lead.email || null,
            contatoNome: lead.nome,
          },
        });
      }
      let oportunidade = null;
      if (imovelId) {
        const imovel = await tx.imovel.findUnique({ where: { id: +imovelId } });
        if (!imovel) throw Object.assign(new Error('Imóvel não encontrado'), { status: 404 });
        oportunidade = await tx.oportunidade.create({
          data: { imovelId: imovel.id, empresaId: empresa.id, observacao },
        });
      }
      const atualizado = await tx.lead.update({
        where: { id: lead.id },
        data: { status: 'convertido', empresaId: empresa.id, oportunidadeId: oportunidade?.id || null },
      });
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
