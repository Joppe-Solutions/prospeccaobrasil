const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  r.get('/', asyncHandler(async (req, res) => {
    const despesas = await prisma.imovelDespesa.findMany({
      orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
      include: {
        imovel: { select: { id: true, codigo: true, endereco: true, numero: true, bairro: true, cidade: true } },
      },
    });
    const total = despesas.reduce((s, d) => s + Number(d.valor || 0), 0);
    const porImovelMap = new Map();
    for (const d of despesas) {
      const key = d.imovelId;
      const cur = porImovelMap.get(key) || { imovel: d.imovel, total: 0, qtd: 0 };
      cur.total += Number(d.valor || 0);
      cur.qtd += 1;
      porImovelMap.set(key, cur);
    }
    res.json({
      total,
      qtd: despesas.length,
      porImovel: [...porImovelMap.values()].sort((a, b) => b.total - a.total),
      despesas,
    });
  }));

  return r;
};
