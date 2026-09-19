const express = require('express');
const auth = require('../middleware/auth');

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  r.get('/', async (req, res) => {
    const { q, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (q) where.OR = [
      { nome: { contains: q } }, { segmento: { contains: q } },
      { contatoNome: { contains: q } }, { cidade: { contains: q } },
    ];
    res.json(await prisma.empresa.findMany({ where, orderBy: { nome: 'asc' } }));
  });

  r.get('/:id', async (req, res) => {
    const e = await prisma.empresa.findUnique({
      where: { id: +req.params.id },
      include: { oportunidades: { include: { imovel: true }, orderBy: { criadoEm: 'desc' } } },
    });
    if (!e) return res.status(404).json({ error: 'Não encontrada' });
    res.json(e);
  });

  r.post('/', async (req, res) => {
    res.json(await prisma.empresa.create({ data: req.body }));
  });

  r.put('/:id', async (req, res) => {
    res.json(await prisma.empresa.update({ where: { id: +req.params.id }, data: req.body }));
  });

  r.delete('/:id', async (req, res) => {
    await prisma.empresa.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  });

  return r;
};
