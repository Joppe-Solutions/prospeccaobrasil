const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const paginate = require('../lib/paginate');
const { DOC_PUBLICOS } = require('../lib/publicDocs');

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  // Central de documentos: todos os anexos de imóveis.
  // Não-admin vê apenas tipos públicos (mesma política da apresentação).
  r.get('/', asyncHandler(async (req, res) => {
    const { tipo, q } = req.query;
    const where = {};
    if (req.user.role !== 'admin') where.tipo = { in: [...DOC_PUBLICOS] };
    else if (tipo) where.tipo = tipo;
    if (q) {
      where.OR = [
        { nome: { contains: q } },
        { imovel: { codigo: { contains: q } } },
        { imovel: { endereco: { contains: q } } },
      ];
    }
    await paginate(req, res, prisma.imovelDocumento, {
      where,
      orderBy: { criadoEm: 'desc' },
      include: { imovel: { select: { id: true, codigo: true, titulo: true, endereco: true, cidade: true } } },
    });
  }));

  return r;
};
