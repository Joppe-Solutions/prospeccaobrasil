const express = require('express');
const { usuarioDaRequisicao } = require('../middleware/auth');
const { renderInteligencia } = require('../templates/inteligencia');
const { demografia } = require('../services/demografia');
const { gerarPdf } = require('../services/pdf');

// Documento interno: exige sessão ativa (Bearer ou ?token= de arquivo), como os uploads privados.
module.exports = (prisma) => {
  const r = express.Router();
  // PDF em A4 paisagem gerado no servidor (imprimir pelo Safari/Firefox pode partir as folhas)
  r.get('/:id/pdf', async (req, res) => {
    if (!(await usuarioDaRequisicao(req))) return res.status(401).send('Documento restrito — entre no sistema para visualizar');
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).send('Análise não encontrada');
    const analise = await prisma.analiseMercado.findUnique({ where: { id }, select: { imovel: { select: { codigo: true } } } });
    if (!analise) return res.status(404).send('Análise não encontrada');
    try {
      const token = req.query.token ? `?token=${encodeURIComponent(req.query.token)}` : '';
      const pdf = await gerarPdf(`http://127.0.0.1:${req.socket.localPort}/inteligencia/${id}${token}`, {
        timeout: 45000, headers: req.headers.authorization ? { Authorization: req.headers.authorization } : undefined,
      });
      const nome = `Inteligencia-${String(analise.imovel?.codigo || id).replace(/[^\w.-]+/g, '-')}.pdf`;
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nome}"`, 'Cache-Control': 'private, no-store' }).send(pdf);
    } catch (e) {
      console.error('PDF da inteligência falhou:', e.message);
      res.status(503).send('Não foi possível gerar o PDF agora. Tente novamente em instantes.');
    }
  });
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
