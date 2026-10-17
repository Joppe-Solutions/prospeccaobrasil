const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const paginate = require('../lib/paginate');

const { fail, UFS, soDigitos, documentoValido } = require('../lib/validar');

const PARCEIRO_FIELDS = [
  'nome', 'tipo', 'tipoPessoa', 'documento', 'creci', 'creciUf', 'oab', 'oabUf', 'responsavel',
  'telefone', 'email', 'cidade', 'uf', 'observacoes', 'status',
];
const TIPOS = ['corretor', 'imobiliaria', 'advogado', 'indicador', 'outro'];
const COM_CRECI = ['corretor', 'imobiliaria'];

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  const pickParceiro = (body = {}) => {
    const d = {};
    for (const k of PARCEIRO_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
      if (body[k] !== null && typeof body[k] !== 'string') fail(`Texto inválido: ${k}`);
      const v = typeof body[k] === 'string' ? body[k].trim() : '';
      if (!v && ['status', 'tipoPessoa'].includes(k)) continue; // campos obrigatórios: vazio = não alterar
      d[k] = v || null;
    }
    return d;
  };

  // Regras por tipo: corretor e imobiliária têm CRECI, advogado tem OAB; imobiliária é sempre pessoa jurídica.
  // Campos que não pertencem ao tipo escolhido são limpos para não ficar registro de outro tipo.
  function validar(d, atual, body) {
    const p = { tipoPessoa: 'pf', ...atual, ...d };
    if (p.tipo && !TIPOS.includes(p.tipo)) fail('Tipo de parceiro inválido');
    if (!['pf', 'pj'].includes(p.tipoPessoa)) fail('Informe se o parceiro é pessoa física ou jurídica');
    if (p.tipo === 'imobiliaria' && p.tipoPessoa !== 'pj') fail('Imobiliária é sempre pessoa jurídica');
    if (p.documento) {
      d.documento = soDigitos(p.documento);
      if (!documentoValido(d.documento, p.tipoPessoa)) fail(p.tipoPessoa === 'pj' ? 'CNPJ inválido' : 'CPF inválido');
    }
    for (const k of ['uf', 'creciUf', 'oabUf']) {
      if (d[k]) { d[k] = d[k].toUpperCase(); if (!UFS.includes(d[k])) fail(`UF inválida: ${d[k]}`); }
    }
    // Só o que muda o resultado exige o registro profissional (cadastros antigos sem CRECI continuam editáveis)
    const mexeu = !atual || ['tipo', 'tipoPessoa', 'creci', 'creciUf', 'oab', 'oabUf'].some((k) => k in body);
    if (COM_CRECI.includes(p.tipo)) {
      if (d.creci !== undefined) d.creci = soDigitos(d.creci) || null;
      const creci = d.creci !== undefined ? d.creci : p.creci;
      if (mexeu && !creci) fail(`Informe o CRECI ${p.tipoPessoa === 'pj' ? 'jurídico' : 'físico'}`);
      if (creci && (creci.length < 3 || creci.length > 8)) fail('CRECI inválido (use só o número, de 3 a 8 dígitos)');
      if (mexeu && !(d.creciUf || p.creciUf)) fail('Informe a UF do CRECI');
    } else Object.assign(d, { creci: null, creciUf: null });
    if (p.tipo === 'advogado') {
      if (d.oab !== undefined) d.oab = soDigitos(d.oab) || null;
      const oab = d.oab !== undefined ? d.oab : p.oab;
      if (mexeu && !oab) fail('Informe o número da OAB');
      if (oab && (oab.length < 2 || oab.length > 7)) fail('OAB inválida (use só o número)');
      if (mexeu && !(d.oabUf || p.oabUf)) fail('Informe a UF da OAB');
    } else Object.assign(d, { oab: null, oabUf: null });
    if (p.tipoPessoa !== 'pj') d.responsavel = null;
    return d;
  }

  r.get('/', asyncHandler(async (req, res) => {
    const { q, status, tipo } = req.query;
    const where = {};
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (q) where.OR = [
      { nome: { contains: q } }, { telefone: { contains: q } },
      { email: { contains: q } }, { cidade: { contains: q } },
    ];
    await paginate(req, res, prisma.parceiro, {
      where,
      orderBy: { nome: 'asc' },
      include: { _count: { select: { imoveis: true } } },
    });
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const p = await prisma.parceiro.findUnique({
      where: { id: +req.params.id },
      include: { imoveis: { orderBy: { criadoEm: 'desc' } } },
    });
    if (!p) return res.status(404).json({ error: 'Não encontrado' });
    res.json(p);
  }));

  r.post('/', asyncHandler(async (req, res) => {
    const d = validar(pickParceiro(req.body), null, req.body);
    if (!d.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    if (!d.status) d.status = 'ativo';
    res.json(await prisma.parceiro.create({ data: d }));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    const atual = await prisma.parceiro.findUnique({ where: { id: +req.params.id } });
    if (!atual) return res.status(404).json({ error: 'Parceiro não encontrado' });
    const d = validar(pickParceiro(req.body), atual, req.body);
    if ('nome' in d && !d.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    res.json(await prisma.parceiro.update({ where: { id: atual.id }, data: d }));
  }));

  r.delete('/:id', auth.requireRole('admin'), asyncHandler(async (req, res) => {
    await prisma.parceiro.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  }));

  return r;
};
