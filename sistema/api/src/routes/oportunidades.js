const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const paginate = require('../lib/paginate');

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  r.get('/', asyncHandler(async (req, res) => {
    await paginate(req, res, prisma.oportunidade, {
      orderBy: { atualizadoEm: 'desc' },
      include: { imovel: true, empresa: true },
    });
  }));

  const MODALIDADES = new Set(['expansao_redes', 'locacao_direta', 'passagem_ponto']);

  r.post('/', asyncHandler(async (req, res) => {
    const { imovelId, empresaId, etapa, observacao, modalidade } = req.body;
    if (!imovelId || !empresaId) return res.status(400).json({ error: 'Imóvel e empresa são obrigatórios' });
    if (modalidade && !MODALIDADES.has(modalidade)) return res.status(400).json({ error: 'Modalidade inválida' });
    res.json(await prisma.oportunidade.create({
      data: { imovelId: +imovelId, empresaId: +empresaId, etapa: etapa || 'apresentado', observacao, modalidade: modalidade || null },
      include: { imovel: true, empresa: true },
    }));
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    const { etapa, observacao, modalidade } = req.body;
    if (modalidade !== undefined && modalidade !== null && !MODALIDADES.has(modalidade)) return res.status(400).json({ error: 'Modalidade inválida' });
    const data = {};
    if (etapa !== undefined) data.etapa = etapa;
    if (observacao !== undefined) data.observacao = observacao;
    if (modalidade !== undefined) data.modalidade = modalidade || null;
    res.json(await prisma.oportunidade.update({ where: { id: +req.params.id }, data, include: { imovel: true, empresa: true } }));
  }));

  r.delete('/:id', asyncHandler(async (req, res) => {
    await prisma.oportunidade.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  }));

  return r;
};
