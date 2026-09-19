const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  r.get('/', asyncHandler(async (req, res) => {
    const [imoveis, disponiveis, empresas, oportunidades, porStatus, recentes] = await Promise.all([
      prisma.imovel.count(),
      prisma.imovel.count({ where: { status: 'disponivel' } }),
      prisma.empresa.count({ where: { status: 'ativo' } }),
      prisma.oportunidade.count(),
      prisma.imovel.groupBy({ by: ['status'], _count: true }),
      prisma.imovel.findMany({ orderBy: { criadoEm: 'desc' }, take: 5, include: { fotos: { where: { principal: true }, take: 1 } } }),
    ]);
    res.json({ imoveis, disponiveis, empresas, oportunidades, porStatus, recentes });
  }));

  return r;
};
