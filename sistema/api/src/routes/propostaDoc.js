const express = require('express');
const asyncHandler = require('../middleware/async');
const { usuarioDaRequisicao } = require('../middleware/auth');
const { renderProposta } = require('../templates/proposta');

// Documento da proposta no modelo oficial. Interno: sessão (Bearer) ou ?token= de arquivo.
module.exports = (prisma) => {
  const r = express.Router();
  r.get('/:id', asyncHandler(async (req, res) => {
    if (!(await usuarioDaRequisicao(req))) return res.status(401).send('Documento restrito — entre no sistema para visualizar');
    const id = Number(req.params.id);
    const proposta = Number.isSafeInteger(id) && id > 0
      ? await prisma.propostaServico.findUnique({ where: { id }, include: { empresa: true } })
      : null;
    if (!proposta) return res.status(404).send('Proposta não encontrada');
    res.setHeader('Cache-Control', 'private, no-store');
    res.type('html').send(renderProposta(proposta));
  }));
  return r;
};
