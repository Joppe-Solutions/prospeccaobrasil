const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const paginate = require('../lib/paginate');

const EMPRESA_FIELDS = [
  'nome', 'segmento', 'cnpj', 'site', 'telefone', 'email',
  'contatoNome', 'contatoCargo', 'cidade', 'uf', 'perfilLoja',
  'areaMinima', 'areaMaxima', 'regioesInteresse', 'observacoes', 'status',
];
const NUM_FIELDS = new Set(['areaMinima', 'areaMaxima']);

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v));
  const pickEmpresa = (body = {}) => {
    const d = {};
    for (const k of EMPRESA_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        d[k] = NUM_FIELDS.has(k) ? num(body[k]) : body[k];
      }
    }
    return d;
  };

  r.get('/', asyncHandler(async (req, res) => {
    const { q, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (q) where.OR = [
      { nome: { contains: q } }, { segmento: { contains: q } },
      { contatoNome: { contains: q } }, { cidade: { contains: q } },
    ];
    await paginate(req, res, prisma.empresa, { where, orderBy: { nome: 'asc' } });
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const e = await prisma.empresa.findUnique({
      where: { id: +req.params.id },
      include: { oportunidades: { include: { imovel: true }, orderBy: { criadoEm: 'desc' } } },
    });
    if (!e) return res.status(404).json({ error: 'Não encontrada' });
    res.json(e);
  }));

  r.post('/', asyncHandler(async (req, res) => {
    const d = pickEmpresa(req.body);
    if (!d.nome) return res.status(400).json({ error: 'Nome obrigatório' });
    res.json(await prisma.empresa.create({ data: d }));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    res.json(await prisma.empresa.update({ where: { id: +req.params.id }, data: pickEmpresa(req.body) }));
  }));

  r.delete('/:id', asyncHandler(async (req, res) => {
    const id = +req.params.id;
    const vinculos = await prisma.oportunidade.count({ where: { empresaId: id } });
    if (vinculos > 0) {
      return res.status(409).json({ error: 'Empresa possui oportunidades vinculadas. Exclua ou transfira as oportunidades antes.' });
    }
    await prisma.empresa.delete({ where: { id } });
    res.json({ ok: true });
  }));

  return r;
};
