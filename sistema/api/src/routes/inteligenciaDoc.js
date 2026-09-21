const express = require('express');
const jwt = require('jsonwebtoken');
const { renderInteligencia } = require('../templates/inteligencia');
const { demografia } = require('../services/demografia');

// Documento interno: exige sessão ativa (Bearer ou ?token=), como os uploads privados.
module.exports = (prisma) => {
  const r = express.Router();
  r.get('/:id', async (req, res) => {
    try {
      const bearer = (req.headers.authorization || '').replace(/^Bearer /, '');
      const tok = bearer || String(req.query.token || '');
      const payload = jwt.verify(tok, process.env.JWT_SECRET);
      const usuario = await prisma.usuario.findUnique({ where: { id: payload.id }, select: { ativo: true } });
      if (!usuario?.ativo) return res.status(401).send('Sessão inválida');
    } catch {
      return res.status(401).send('Documento restrito — entre no sistema para visualizar');
    }
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).send('Análise não encontrada');
    const analise = await prisma.analiseMercado.findUnique({ where: { id }, include: { imovel: true } });
    if (!analise) return res.status(404).send('Análise não encontrada');
    const demo = await demografia(analise.imovel);
    res.setHeader('Cache-Control', 'private, no-store');
    res.type('html').send(renderInteligencia(analise.imovel, analise, demo));
  });
  return r;
};
