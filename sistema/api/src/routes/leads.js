const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const paginate = require('../lib/paginate');

const LEAD_FIELDS = [
  'nome', 'telefone', 'email', 'origem', 'interesse', 'status', 'observacoes',
  'responsavelId', 'proximaAcao', 'proximaAcaoEm',
];
const LEAD_STATUS = new Set(['novo', 'em_contato', 'qualificado', 'convertido', 'perdido']);
const LEAD_ORIGENS = new Set(['site', 'anuncio', 'indicacao', 'outro']);
const ATIVIDADE_TIPOS = new Set(['nota', 'ligacao', 'whatsapp', 'email', 'visita', 'status']);

// Data civil estrita AAAA-MM-DD → meio-dia UTC (sem deslocamento de fuso)
function parseDataCivil(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const [y, mo, dd] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, dd, 12));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== dd) return null;
  return dt;
}
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
    if (d.responsavelId !== undefined) d.responsavelId = d.responsavelId ? +d.responsavelId : null;
    if (d.proximaAcao !== undefined) d.proximaAcao = String(d.proximaAcao || '').trim() || null;
    if (d.proximaAcaoEm !== undefined) {
      if (!d.proximaAcaoEm) d.proximaAcaoEm = null;
      else {
        const dt = parseDataCivil(d.proximaAcaoEm);
        if (dt === undefined) return { _erro: 'Data da próxima ação deve ser AAAA-MM-DD' };
        if (dt === null) return { _erro: 'Data da próxima ação inválida' };
        d.proximaAcaoEm = dt;
      }
    }
    return d;
  };

  const valida = (d) => {
    if (d.status !== undefined && !LEAD_STATUS.has(d.status)) return 'Status inválido';
    if (d.origem !== undefined && d.origem && !LEAD_ORIGENS.has(d.origem)) return 'Origem inválida';
    if (d.email) return EMAIL_RE.test(d.email) ? null : 'E-mail inválido';
    if (d.responsavelId !== undefined && d.responsavelId !== null && !Number.isInteger(d.responsavelId)) {
      return 'Responsável inválido';
    }
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
    await paginate(req, res, prisma.lead, {
      where,
      include: { responsavel: { select: { id: true, nome: true } } },
      orderBy: { criadoEm: 'desc' },
    });
  }));

  // Opções de responsável para qualquer usuário autenticado (só id/nome)
  r.get('/responsaveis', asyncHandler(async (req, res) => {
    res.json(await prisma.usuario.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }));
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: +req.params.id },
      include: {
        interacoes: { orderBy: { criadoEm: 'desc' } },
        atividades: { orderBy: { criadoEm: 'desc' }, include: { autor: { select: { id: true, nome: true } } } },
        responsavel: { select: { id: true, nome: true } },
      },
    });
    if (!lead) return res.status(404).json({ error: 'Não encontrado' });
    res.json(lead);
  }));

  const checaResponsavel = async (d) => {
    if (d.responsavelId == null) return null;
    const u = await prisma.usuario.findUnique({ where: { id: d.responsavelId } });
    if (!u || !u.ativo) return 'Responsável não encontrado ou inativo';
    return null;
  };

  r.post('/', asyncHandler(async (req, res) => {
    const d = pickLead(req.body);
    if (d._erro) return res.status(400).json({ error: d._erro });
    if (!d.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    const erro = valida(d) || await checaResponsavel(d);
    if (erro) return res.status(400).json({ error: erro });
    if (!d.origem) d.origem = 'site';
    if (!d.status) d.status = 'novo';
    res.json(await prisma.lead.create({ data: d }));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    const d = pickLead(req.body);
    if (d._erro) return res.status(400).json({ error: d._erro });
    if (d.nome !== undefined && !d.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    const erro = valida(d) || await checaResponsavel(d);
    if (erro) return res.status(400).json({ error: erro });
    const lead = await prisma.lead.findUnique({ where: { id: +req.params.id } });
    if (!lead) return res.status(404).json({ error: 'Não encontrado' });
    // "convertido" só via POST /:id/converter — status sozinho não é prova de conversão
    if (d.status === 'convertido' && !lead.empresaId) {
      return res.status(400).json({ error: 'Use a ação "Converter" para vincular empresa/oportunidade' });
    }
    // Remover o vínculo exige conversão nova, não apenas mudança de status
    delete d.empresaId; delete d.oportunidadeId;
    // Mudança de status vira atividade no histórico
    const atualizado = await prisma.$transaction(async (tx) => {
      const l = await tx.lead.update({ where: { id: lead.id }, data: d });
      if (d.status && d.status !== lead.status) {
        await tx.leadAtividade.create({
          data: { leadId: lead.id, tipo: 'status', texto: `Status: ${lead.status} → ${d.status}`, autorId: req.user.id },
        });
      }
      return l;
    });
    res.json(atualizado);
  }));

  // Registro manual de atividade (ligação, whatsapp, visita...)
  r.post('/:id/atividades', asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: +req.params.id } });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
    const { tipo, texto } = req.body || {};
    const t = String(texto || '').trim();
    if (!t) return res.status(400).json({ error: 'Texto da atividade obrigatório' });
    if (tipo !== undefined && !ATIVIDADE_TIPOS.has(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
    res.status(201).json(await prisma.leadAtividade.create({
      data: { leadId: lead.id, tipo: tipo || 'nota', texto: t, autorId: req.user.id },
    }));
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
