const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const paginate = require('../lib/paginate');

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  // Análises de inteligência de mercado geradas por imóvel
  r.get('/', asyncHandler(async (req, res) => {
    const { q } = req.query;
    const where = {};
    if (q) {
      where.OR = [
        { imovel: { codigo: { contains: q } } },
        { imovel: { endereco: { contains: q } } },
        { imovel: { cidade: { contains: q } } },
      ];
    }
    await paginate(req, res, prisma.analiseMercado, {
      where,
      orderBy: { criadoEm: 'desc' },
      include: { imovel: { select: { id: true, codigo: true, titulo: true, endereco: true, cidade: true, uf: true, status: true } } },
    });
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const a = await prisma.analiseMercado.findUnique({
      where: { id: +req.params.id },
      include: { imovel: { select: { id: true, codigo: true, titulo: true, endereco: true, cidade: true, uf: true } } },
    });
    if (!a) return res.status(404).json({ error: 'Análise não encontrada' });
    res.json({ ...a, conteudo: a.conteudoJson ? JSON.parse(a.conteudoJson) : null });
  }));

  return r;
};
