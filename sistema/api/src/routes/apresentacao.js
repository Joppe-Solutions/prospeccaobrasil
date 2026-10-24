const express = require('express');
const QRCode = require('qrcode');
const asyncHandler = require('../middleware/async');
const { mapa } = require('../services/demografia');
const { geocode, mapaEstatico, usaGoogle, coordenadasCadastradas } = require('../services/mapas');
const censo2022 = require('../services/censo2022');
const setores = require('../services/setores');
const { PARCEIRO_PUBLICO } = require('../lib/parceiros');
const { entorno } = require('../services/entorno');
const { gerarPdf } = require('../services/pdf');
const { renderApresentacao, renderGaleria, locationUrl } = require('../templates/apresentacao');

const limite = (promessa, ms) => Promise.race([promessa.catch(() => null), new Promise((resolve) => setTimeout(resolve, ms, null))]);

module.exports = (prisma) => {
  const r = express.Router();
  r.get('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).send('Imóvel não encontrado');
    const imovel = await prisma.imovel.findUnique({
      where: { id },
      include: {
        fotos: { orderBy: [{ principal: 'desc' }, { ordem: 'asc' }] }, areas: { orderBy: { ordem: 'asc' } }, documentos: true, parceiro: { select: PARCEIRO_PUBLICO },
      },
    });
    if (!imovel || imovel.status === 'inativo') return res.status(404).send('Imóvel não encontrado');
    const qrData = await QRCode.toDataURL(locationUrl(imovel), {
      margin: 4, width: 240, color: { dark: '#153c34', light: '#ffffff' },
    });
    // Mapa ao lado da foto: coordenadas do cadastro ou geocodificação (com cache). Se o
    // serviço demorar ou falhar, a apresentação sai só com a foto.
    // Nos testes só vale coordenada cadastrada (sem chamada externa), salvo com a chave do Google simulada.
    const semRede = process.env.NODE_ENV === 'test' && !coordenadasCadastradas(imovel) && !usaGoogle();
    const geo = semRede ? null : await limite(geocode(imovel), 3000);
    // Com a chave do Google o mapa é a imagem do Google (servida do cache em /mapa.png); sem ela, tiles do OpenStreetMap.
    const imagem = geo && usaGoogle() ? await limite(mapaEstatico(geo), 5000) : null;
    const mapaDoc = imagem ? { imagem: `/apresentacao/${id}/mapa.png`, precisao: geo.precisao } : geo ? { ...mapa(geo, { z: 16, cols: 5, rows: 3 }), precisao: geo.precisao } : null;
    // Contexto do ponto (folha de complementos): bairro no Censo 2022 e entorno da rua.
    // O entorno tem 4 s para responder; se passar disso, a consulta segue e fica em cache para a próxima abertura.
    const municipio = censo2022.codigoMunicipio(imovel.cidade, imovel.uf);
    const vizinhanca = entorno(geo, imovel).catch(() => null);
    const contexto = {
      bairro: municipio ? censo2022.bairro(municipio, imovel.bairro) : null,
      raio: geo ? setores.raio(geo.lat, geo.lon, 1000) : null,
      entorno: await Promise.race([vizinhanca, new Promise((resolve) => setTimeout(resolve, 4000, null))]),
    };
    res.type('html').send(renderApresentacao(imovel, qrData, {
      // padrão: as duas folhas; ?formato=resumo imprime só a primeira
      completa: req.query.formato !== 'resumo',
      mapa: mapaDoc,
      contexto,
    }));
  }));
  // PDF em A4 exato gerado no servidor (Chromium): imprimir pelo navegador pode partir as folhas
  r.get('/:id/pdf', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).send('Imóvel não encontrado');
    const imovel = await prisma.imovel.findUnique({ where: { id }, select: { codigo: true, status: true } });
    if (!imovel || imovel.status === 'inativo') return res.status(404).send('Imóvel não encontrado');
    const resumo = req.query.formato === 'resumo';
    try {
      const pdf = await gerarPdf(`http://127.0.0.1:${req.socket.localPort}/apresentacao/${id}${resumo ? '?formato=resumo' : ''}`);
      const nome = `Apresentacao-${String(imovel.codigo || id).replace(/[^\w.-]+/g, '-')}${resumo ? '-resumo' : ''}.pdf`;
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nome}"`, 'Cache-Control': 'no-store' }).send(pdf);
    } catch (e) {
      console.error('PDF da apresentação falhou:', e.message);
      res.status(503).send('Não foi possível gerar o PDF agora. Tente novamente em instantes ou use a impressão do navegador (Chrome).');
    }
  }));
  // Imagem do mapa (cache em disco): evita expor a chave do Google e cobrar uma chamada por visualização
  r.get('/:id/mapa.png', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).end();
    const imovel = await prisma.imovel.findUnique({ where: { id } });
    if (!imovel || imovel.status === 'inativo') return res.status(404).end();
    const geo = await limite(geocode(imovel), 5000);
    const imagem = geo && (await limite(mapaEstatico(geo), 8000));
    if (!imagem) return res.status(404).end();
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('png').send(imagem);
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
