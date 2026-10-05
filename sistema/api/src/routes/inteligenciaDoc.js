const express = require('express');
const { usuarioDaRequisicao } = require('../middleware/auth');
const { renderInteligencia } = require('../templates/inteligencia');
const { demografia } = require('../services/demografia');

// Documento interno: exige sessão ativa (Bearer ou ?token= de arquivo), como os uploads privados.
module.exports = (prisma) => {
  const r = express.Router();
  r.get('/:id', async (req, res) => {
    if (!(await usuarioDaRequisicao(req))) return res.status(401).send('Documento restrito — entre no sistema para visualizar');
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).send('Análise não encontrada');
    const analise = await prisma.analiseMercado.findUnique({ where: { id }, include: { imovel: { include: { fotos: { orderBy: { id: 'asc' }, take: 1 } } } } });
    if (!analise) return res.status(404).send('Análise não encontrada');
    const demo = await demografia(analise.imovel);
    res.setHeader('Cache-Control', 'private, no-store');
    res.type('html').send(renderInteligencia(analise.imovel, analise, demo));
  });
  return r;
};
