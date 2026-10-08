const express = require('express');
const QRCode = require('qrcode');
const asyncHandler = require('../middleware/async');
const { renderApresentacao, renderGaleria, locationUrl } = require('../templates/apresentacao');

module.exports = (prisma) => {
  const r = express.Router();
  r.get('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).send('Imóvel não encontrado');
    const imovel = await prisma.imovel.findUnique({
      where: { id },
      include: { fotos: { orderBy: [{ principal: 'desc' }, { ordem: 'asc' }] }, areas: { orderBy: { ordem: 'asc' } }, documentos: true },
    });
    if (!imovel || imovel.status === 'inativo') return res.status(404).send('Imóvel não encontrado');
    const qrData = await QRCode.toDataURL(locationUrl(imovel), {
      margin: 4, width: 240, color: { dark: '#153c34', light: '#ffffff' },
    });
    res.type('html').send(renderApresentacao(imovel, qrData, { completa: req.query.formato === 'completa' }));
  }));
  // Galeria pública de fotos (substitui o link de pasta do Google Drive)
  r.get('/:id/fotos', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).send('Imóvel não encontrado');
    const imovel = await prisma.imovel.findUnique({
      where: { id },
      include: { fotos: { orderBy: [{ principal: 'desc' }, { ordem: 'asc' }] } },
    });
    if (!imovel || imovel.status === 'inativo') return res.status(404).send('Imóvel não encontrado');
    res.type('html').send(renderGaleria(imovel));
  }));
  return r;
};
