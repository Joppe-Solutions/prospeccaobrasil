const express = require('express');
const { custoTotal } = require('../services/inteligencia');

module.exports = (prisma) => {
  const r = express.Router();

  // Dados públicos do imóvel para a página de apresentação
  r.get('/imoveis/:id', async (req, res) => {
    const i = await prisma.imovel.findUnique({
      where: { id: +req.params.id },
      include: {
        fotos: { orderBy: [{ principal: 'desc' }, { ordem: 'asc' }] },
        documentos: true,
        analises: { orderBy: { criadoEm: 'desc' }, take: 1 },
      },
    });
    if (!i) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ ...i, custoTotal: custoTotal(i) });
  });

  return r;
};
