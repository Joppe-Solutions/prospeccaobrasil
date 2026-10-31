const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');

module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);

  r.get('/', asyncHandler(async (req, res) => {
    const resumo = { select: { id: true, codigo: true, endereco: true, numero: true, bairro: true } };
    const [imoveis, disponiveis, empresas, oportunidades, porStatus, recentes, semFoto, semAnalise, acoesAbertas] = await Promise.all([
      prisma.imovel.count(),
      prisma.imovel.count({ where: { status: 'disponivel' } }),
      prisma.empresa.count({ where: { status: 'ativo' } }),
      prisma.oportunidade.count(),
      prisma.imovel.groupBy({ by: ['status'], _count: true }),
      prisma.imovel.findMany({ orderBy: { criadoEm: 'desc' }, take: 5, include: { fotos: { where: { principal: true }, take: 1 } } }),
      // Pendências do portfólio: o que impede um imóvel disponível de ser apresentado completo
      prisma.imovel.findMany({ where: { status: 'disponivel', fotos: { none: {} } }, orderBy: { criadoEm: 'desc' }, take: 6, ...resumo }),
      prisma.imovel.findMany({ where: { status: 'disponivel', analises: { none: {} } }, orderBy: { criadoEm: 'desc' }, take: 6, ...resumo }),
      // Ações em andamento, as paradas há mais tempo primeiro
      prisma.oportunidade.findMany({
        where: { etapa: { notIn: ['fechado', 'perdido'] } },
        orderBy: { atualizadoEm: 'asc' }, take: 6,
        select: { id: true, etapa: true, propostaStatus: true, proximaAcao: true, proximaAcaoEm: true, atualizadoEm: true, empresa: { select: { id: true, nome: true } }, imovel: resumo },
      }),
    ]);
    res.json({ imoveis, disponiveis, empresas, oportunidades, porStatus, recentes, pendencias: { semFoto, semAnalise }, acoesAbertas });
  }));

  return r;
};
