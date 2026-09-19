const express = require('express');
const auth = require('../middleware/auth');

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  r.get('/', async (req, res) => {
    res.json(await prisma.oportunidade.findMany({
      orderBy: { atualizadoEm: 'desc' },
      include: { imovel: true, empresa: true },
    }));
  });

  r.post('/', async (req, res) => {
    const { imovelId, empresaId, etapa, observacao } = req.body;
    res.json(await prisma.oportunidade.create({
      data: { imovelId: +imovelId, empresaId: +empresaId, etapa: etapa || 'apresentado', observacao },
      include: { imovel: true, empresa: true },
    }));
  });

  r.put('/:id', async (req, res) => {
    const { etapa, observacao } = req.body;
    res.json(await prisma.oportunidade.update({ where: { id: +req.params.id }, data: { etapa, observacao }, include: { imovel: true, empresa: true } }));
  });

  r.delete('/:id', async (req, res) => {
    await prisma.oportunidade.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  });

  return r;
};
