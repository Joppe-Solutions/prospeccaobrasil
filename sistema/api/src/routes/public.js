const express = require('express');
const { custoTotal } = require('../services/inteligencia');
const asyncHandler = require('../middleware/async');

/** Tipos de documento seguros para exposição pública (sem docs internos/sensíveis). */
const DOC_PUBLICOS = new Set(['planta']);

module.exports = (prisma) => {
  const r = express.Router();

  // Dados públicos do imóvel para a página de apresentação
  r.get('/imoveis/:id', asyncHandler(async (req, res) => {
    const i = await prisma.imovel.findUnique({
      where: { id: +req.params.id },
      include: {
        fotos: { orderBy: [{ principal: 'desc' }, { ordem: 'asc' }] },
        documentos: true,
        analises: { orderBy: { criadoEm: 'desc' }, take: 1 },
      },
    });
    if (!i) return res.status(404).json({ error: 'Não encontrado' });

    const {
      proprietario,
      telProprietario,
      observacoes,
      documentos,
      ...safe
    } = i;

    res.json({
      ...safe,
      documentos: (documentos || [])
        .filter((d) => DOC_PUBLICOS.has(d.tipo))
        .map(({ id, tipo, nome, url, arquivo, criadoEm }) => ({ id, tipo, nome, url, arquivo, criadoEm })),
      custoTotal: custoTotal(i),
    });
  }));

  return r;
};
