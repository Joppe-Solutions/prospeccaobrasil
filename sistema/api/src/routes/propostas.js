const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const { fail } = require('../lib/validar');

// Campos de texto = espaços variáveis do modelo oficial de proposta (templates/proposta.js)
const TEXTOS = ['numero', 'marca', 'areaAtuacao', 'quantidadeUnidades', 'prazoAtuacao', 'contratante', 'honorariosProspeccao', 'remuneracaoIntermediacao', 'formaPagamento', 'exclusividade', 'validade', 'observacoes'];
const STATUS = ['rascunho', 'enviada', 'aceita', 'recusada'];
const include = { empresa: { select: { id: true, nome: true } }, demanda: { select: { id: true, titulo: true } } };

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  function pick(body = {}) {
    const d = {};
    for (const k of TEXTOS) {
      if (!Object.hasOwn(body, k)) continue;
      if (body[k] !== null && typeof body[k] !== 'string') fail(`Texto inválido: ${k}`);
      d[k] = (body[k] || '').trim().slice(0, k === 'observacoes' ? 4000 : 300) || null;
    }
    for (const k of ['empresaId', 'demandaId']) {
      if (!Object.hasOwn(body, k)) continue;
      d[k] = body[k] === '' || body[k] == null ? null : Number(body[k]);
      if (d[k] !== null && (!Number.isSafeInteger(d[k]) || d[k] < 1)) fail('Vínculo inválido');
    }
    if (Object.hasOwn(body, 'data')) {
      d.data = body.data || null;
      if (d.data && (!/^\d{4}-\d{2}-\d{2}$/.test(d.data) || new Date(d.data).toISOString().slice(0, 10) !== d.data)) fail('Data inválida');
    }
    if (Object.hasOwn(body, 'status') && !STATUS.includes(d.status = body.status)) fail('Status inválido');
    return d;
  }

  async function validar(d, atual) {
    const p = { ...atual, ...d };
    if (!p.empresaId) fail('Selecione o cliente da proposta');
    if (!(await prisma.empresa.findUnique({ where: { id: p.empresaId }, select: { id: true } }))) fail('Cliente não encontrado');
    if (p.demandaId) {
      const demanda = await prisma.demanda.findUnique({ where: { id: p.demandaId }, select: { empresaId: true } });
      if (!demanda || demanda.empresaId !== p.empresaId) fail('A demanda deve pertencer ao cliente da proposta');
    }
  }

  // Numeração PC-AAAA-NNN, sequencial por ano
  async function proximoNumero() {
    const ano = new Date().getFullYear();
    const seq = await prisma.sequencia.upsert({ where: { nome: `proposta-${ano}` }, create: { nome: `proposta-${ano}`, valor: 1 }, update: { valor: { increment: 1 } } });
    return `PC-${ano}-${String(seq.valor).padStart(3, '0')}`;
  }
  const duplicado = (e) => (e.code === 'P2002' ? fail('Já existe uma proposta com esse número', 409) : Promise.reject(e));

  r.get('/', asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.demandaId) where.demandaId = Number(req.query.demandaId);
    if (req.query.empresaId) where.empresaId = Number(req.query.empresaId);
    res.json(await prisma.propostaServico.findMany({ where, include, orderBy: { atualizadoEm: 'desc' } }));
  }));

  r.post('/', asyncHandler(async (req, res) => {
    const d = pick(req.body);
    await validar(d);
    d.numero ||= await proximoNumero();
    d.data ||= new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    res.json(await prisma.propostaServico.create({ data: d, include }).catch(duplicado));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    const atual = await prisma.propostaServico.findUnique({ where: { id: +req.params.id } });
    if (!atual) return res.status(404).json({ error: 'Proposta não encontrada' });
    const d = pick(req.body);
    if (Object.hasOwn(d, 'numero') && !d.numero) fail('Informe o número da proposta');
    await validar(d, atual);
    res.json(await prisma.propostaServico.update({ where: { id: atual.id }, data: d, include }).catch(duplicado));
  }));

  r.delete('/:id', auth.requireRole('admin'), asyncHandler(async (req, res) => {
    await prisma.propostaServico.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  }));

  return r;
};
