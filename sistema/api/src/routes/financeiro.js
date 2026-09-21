const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');

const { requireRole } = auth;

const toCents = (v) => Math.round(Number(v || 0) * 100);

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth, requireRole('admin'));

  r.get('/', asyncHandler(async (req, res) => {
    const despesas = await prisma.imovelDespesa.findMany({
      orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
      include: {
        imovel: { select: { id: true, codigo: true, endereco: true, numero: true, bairro: true, cidade: true } },
      },
    });
    // Soma em centavos inteiros para precisão monetária; estornadas não entram nos totais
    const ativas = despesas.filter((d) => !d.estornada);
    const totalCents = ativas.reduce((s, d) => s + toCents(d.valor), 0);
    const porImovelMap = new Map();
    for (const d of ativas) {
      const key = d.imovelId;
      const cur = porImovelMap.get(key) || { imovel: d.imovel, totalCents: 0, qtd: 0 };
      cur.totalCents += toCents(d.valor);
      cur.qtd += 1;
      porImovelMap.set(key, cur);
    }
    res.json({
      total: totalCents / 100,
      qtd: ativas.length,
      porImovel: [...porImovelMap.values()]
        .map((p) => ({ imovel: p.imovel, total: p.totalCents / 100, qtd: p.qtd }))
        .sort((a, b) => b.total - a.total),
      despesas,
    });
  }));

  return r;
};
