const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const paginate = require('../lib/paginate');
const { fail, UFS, soDigitos, documentoValido } = require('../lib/validar');

const PROPRIETARIO_FIELDS = [
  'papel', 'tipoPessoa', 'nome', 'marca', 'documento', 'empresaNome', 'telefone', 'email',
  'cidade', 'uf', 'observacoes', 'status',
];
const PAPEIS = ['proprietario', 'operador'];
const COM_EMPRESA = { empresa: { select: { id: true, nome: true } } };

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  const pickProprietario = (body = {}) => {
    const d = {};
    for (const k of PROPRIETARIO_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
      if (body[k] !== null && typeof body[k] !== 'string') fail(`Texto inválido: ${k}`);
      const v = typeof body[k] === 'string' ? body[k].trim() : '';
      if (!v && ['papel', 'tipoPessoa', 'status'].includes(k)) continue; // obrigatórios: vazio = não alterar
      d[k] = v || null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'empresaId')) {
      d.empresaId = body.empresaId === null || body.empresaId === '' ? null : Number(body.empresaId);
      if (d.empresaId !== null && !Number.isInteger(d.empresaId)) fail('Empresa inválida');
    }
    return d;
  };

  // Validações compartilhadas por criar e editar; `atual` é o registro existente (ou null)
  async function validar(d, atual) {
    const p = { papel: 'proprietario', tipoPessoa: 'pf', ...atual, ...d };
    if (!PAPEIS.includes(p.papel)) fail('Papel inválido');
    if (!['pf', 'pj'].includes(p.tipoPessoa)) fail('Informe se é pessoa física ou jurídica');
    if (p.documento) {
      d.documento = soDigitos(p.documento);
      if (!documentoValido(d.documento, p.tipoPessoa)) fail(p.tipoPessoa === 'pj' ? 'CNPJ inválido' : 'CPF inválido');
    }
    if (d.uf) { d.uf = d.uf.toUpperCase(); if (!UFS.includes(d.uf)) fail(`UF inválida: ${d.uf}`); }
    if (p.papel !== 'operador') d.marca = null; // marca só faz sentido para o operador do ponto
    if (p.tipoPessoa !== 'pj') { d.empresaId = null; d.empresaNome = null; } // empresa só faz sentido para CNPJ
    else if (d.empresaId) {
      if (!await prisma.empresa.findUnique({ where: { id: d.empresaId }, select: { id: true } })) fail('Empresa não encontrada');
      d.empresaNome = null; // com vínculo, o nome vem do cadastro da empresa
    }
    return d;
  }

  r.get('/', asyncHandler(async (req, res) => {
    const { q, status, tipoPessoa, papel } = req.query;
    const where = {};
    if (status) where.status = status;
    if (papel) where.papel = papel;
    if (tipoPessoa) where.tipoPessoa = tipoPessoa;
    if (q) where.OR = [
      { nome: { contains: q } }, { documento: { contains: q } },
      { empresaNome: { contains: q } }, { empresa: { nome: { contains: q } } },
      { telefone: { contains: q } }, { email: { contains: q } }, { cidade: { contains: q } },
    ];
    await paginate(req, res, prisma.proprietario, {
      where,
      orderBy: { nome: 'asc' },
      include: { ...COM_EMPRESA, _count: { select: { imoveis: true, imoveisOperados: true } } },
    });
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const p = await prisma.proprietario.findUnique({
      where: { id: +req.params.id },
      include: { ...COM_EMPRESA, imoveis: { orderBy: { criadoEm: 'desc' } }, imoveisOperados: { orderBy: { criadoEm: 'desc' } } },
    });
    if (!p) return res.status(404).json({ error: 'Não encontrado' });
    res.json(p);
  }));

  r.post('/', asyncHandler(async (req, res) => {
    const d = await validar(pickProprietario(req.body), null);
    if (!d.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    if (!d.tipoPessoa) d.tipoPessoa = 'pf';
    if (!d.status) d.status = 'ativo';
    res.json(await prisma.proprietario.create({ data: d, include: COM_EMPRESA }));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    const atual = await prisma.proprietario.findUnique({ where: { id: +req.params.id } });
    if (!atual) return res.status(404).json({ error: 'Não encontrado' });
    const d = await validar(pickProprietario(req.body), atual);
    if ('nome' in d && !d.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    // Trocar o papel de quem já está vinculado a imóveis deixaria vínculos inconsistentes
    if (d.papel && d.papel !== atual.papel) {
      const vinculos = await prisma.imovel.count({ where: { OR: [{ proprietarioId: atual.id }, { operadorId: atual.id }] } });
      if (vinculos) fail('Este cadastro já está vinculado a imóveis: não é possível trocar o papel', 409);
    }
    res.json(await prisma.proprietario.update({ where: { id: atual.id }, data: d, include: COM_EMPRESA }));
  }));

  r.delete('/:id', auth.requireRole('admin'), asyncHandler(async (req, res) => {
    await prisma.proprietario.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  }));

  return r;
};
