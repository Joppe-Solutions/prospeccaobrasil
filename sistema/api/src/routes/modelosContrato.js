const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const { fail, urlHttp } = require('../lib/validar');

const CATEGORIAS = ['locacao', 'compra_venda', 'passagem_ponto', 'prestacao_servicos', 'confidencialidade', 'outro'];

// Biblioteca de modelos de contrato: todos consultam, só admin mantém.
module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  function pick(body = {}, existente) {
    const texto = (k) => (typeof body[k] === 'string' ? body[k].trim() : body[k] == null ? '' : fail(`Texto inválido: ${k}`));
    const d = {};
    if ('nome' in body || !existente) d.nome = texto('nome') || fail('Informe o nome do modelo');
    if ('categoria' in body) d.categoria = CATEGORIAS.includes(body.categoria) ? body.categoria : fail('Categoria inválida');
    if ('descricao' in body) d.descricao = texto('descricao') || null;
    if ('url' in body || !existente) d.url = urlHttp(body.url) || fail('Informe o link do arquivo');
    return d;
  }

  r.get('/', asyncHandler(async (req, res) => {
    res.json(await prisma.modeloContrato.findMany({ orderBy: [{ categoria: 'asc' }, { nome: 'asc' }] }));
  }));

  r.post('/', auth.requireRole('admin'), asyncHandler(async (req, res) => {
    res.json(await prisma.modeloContrato.create({ data: pick(req.body) }));
  }));

  r.put('/:id', auth.requireRole('admin'), asyncHandler(async (req, res) => {
    res.json(await prisma.modeloContrato.update({ where: { id: +req.params.id }, data: pick(req.body, true) }));
  }));

  r.delete('/:id', auth.requireRole('admin'), asyncHandler(async (req, res) => {
    await prisma.modeloContrato.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  }));

  return r;
};
