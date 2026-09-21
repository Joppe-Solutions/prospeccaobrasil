const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
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

  // ---- Lançamentos (receitas/despesas gerais com baixa e estorno) ----

  const TIPOS = new Set(['receita', 'despesa']);
  const CATEGORIAS = new Set(['aluguel', 'comissao', 'repasse', 'imposto', 'condominio', 'iptu', 'taxa', 'deslocamento', 'documentacao', 'anuncio', 'planta', 'outro']);
  const FORMAS = new Set(['pix', 'boleto', 'transferencia', 'dinheiro', 'cartao', 'outro']);

  // Upload de comprovante (nota fiscal, recibo) — arquivo privado, exige sessão
  const uploadDir = path.join(__dirname, '..', '..', 'uploads');
  const uploadComprovante = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => cb(null, `comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ok = /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.mimetype)
        && /\.(jpe?g|png|webp|pdf)$/i.test(path.extname(file.originalname));
      cb(ok ? null : new Error('Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF.'), ok);
    },
  });

  const parseDataCivil = (s) => {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return undefined;
    const [y, mo, dd] = [+m[1], +m[2], +m[3]];
    const dt = new Date(Date.UTC(y, mo - 1, dd, 12));
    return (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === dd) ? dt : null;
  };

  const num = (v) => v == null || v === '' ? null : Number(v);
  const validaValor = (v) => v != null && Number.isFinite(v) && v > 0
    && Math.abs(v * 100 - Math.round(v * 100)) <= 1e-9;

  const validaLancamento = async (b) => {
    if (!TIPOS.has(b.tipo)) return 'Tipo deve ser receita ou despesa';
    if (!CATEGORIAS.has(b.categoria)) return 'Categoria inválida';
    if (!String(b.descricao || '').trim()) return 'Descrição obrigatória';
    if (!validaValor(num(b.valor))) return 'Valor deve ser positivo com no máximo 2 casas decimais';
    for (const f of ['competencia', 'vencimento']) {
      if (b[f]) { const d = parseDataCivil(b[f]); if (d == null) return `${f} inválida (use AAAA-MM-DD real)`; }
    }
    for (const [campo, model] of [['imovelId', 'imovel'], ['empresaId', 'empresa'], ['oportunidadeId', 'oportunidade']]) {
      if (b[campo] != null) {
        if (!Number.isInteger(+b[campo])) return `${campo} inválido`;
        const existe = await prisma[model].findUnique({ where: { id: +b[campo] }, select: { id: true } });
        if (!existe) return `${campo} não encontrado`;
      }
    }
    return null;
  };

  r.get('/lancamentos', asyncHandler(async (req, res) => {
    const { tipo, status, imovelId, empresaId, oportunidadeId, de, ate, pagina, porPagina } = req.query;
    const where = {};
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (imovelId) where.imovelId = +imovelId;
    if (empresaId) where.empresaId = +empresaId;
    if (oportunidadeId) where.oportunidadeId = +oportunidadeId;
    if (de || ate) {
      where.vencimento = {};
      if (de) { const d = parseDataCivil(de); if (d == null) return res.status(400).json({ error: 'de inválido' }); where.vencimento.gte = d; }
      if (ate) { const d = parseDataCivil(ate); if (d == null) return res.status(400).json({ error: 'ate inválido' }); where.vencimento.lte = d; }
    }
    const include = {
      imovel: { select: { id: true, codigo: true, titulo: true } },
      empresa: { select: { id: true, nome: true } },
      oportunidade: { select: { id: true, etapa: true } },
      criadoPor: { select: { id: true, nome: true } },
    };
    const orderBy = [{ vencimento: 'asc' }, { criadoEm: 'desc' }];
    if (pagina || porPagina) {
      const page = Math.max(1, +pagina || 1);
      const per = Math.min(200, Math.max(1, +porPagina || 25));
      const [total, items] = await Promise.all([
        prisma.lancamento.count({ where }),
        prisma.lancamento.findMany({ where, include, orderBy, skip: (page - 1) * per, take: per }),
      ]);
      return res.json({ items, total, pagina: page, paginas: Math.ceil(total / per) });
    }
    res.json(await prisma.lancamento.findMany({ where, include, orderBy }));
  }));

  r.post('/lancamentos', asyncHandler(async (req, res) => {
    const erro = await validaLancamento(req.body || {});
    if (erro) return res.status(400).json({ error: erro });
    const b = req.body;
    res.status(201).json(await prisma.lancamento.create({
      data: {
        tipo: b.tipo,
        categoria: b.categoria,
        descricao: String(b.descricao).trim(),
        pagador: b.pagador ? String(b.pagador).trim() : null,
        beneficiario: b.beneficiario ? String(b.beneficiario).trim() : null,
        valor: num(b.valor),
        competencia: b.competencia ? parseDataCivil(b.competencia) : null,
        vencimento: b.vencimento ? parseDataCivil(b.vencimento) : null,
        imovelId: b.imovelId ? +b.imovelId : null,
        empresaId: b.empresaId ? +b.empresaId : null,
        oportunidadeId: b.oportunidadeId ? +b.oportunidadeId : null,
        criadoPorId: req.user.id,
      },
    }));
  }));

  // Edição: permitida apenas enquanto previsto; pago/estornado preservam o histórico
  r.put('/lancamentos/:id', asyncHandler(async (req, res) => {
    const l = await prisma.lancamento.findUnique({ where: { id: +req.params.id } });
    if (!l) return res.status(404).json({ error: 'Lançamento não encontrado' });
    if (l.status !== 'previsto') return res.status(409).json({ error: 'Somente lançamentos previstos podem ser editados; use estorno para os demais' });
    const erro = await validaLancamento(req.body || {});
    if (erro) return res.status(400).json({ error: erro });
    const b = req.body;
    res.json(await prisma.lancamento.update({
      where: { id: l.id },
      data: {
        tipo: b.tipo,
        categoria: b.categoria,
        descricao: String(b.descricao).trim(),
        pagador: b.pagador ? String(b.pagador).trim() : null,
        beneficiario: b.beneficiario ? String(b.beneficiario).trim() : null,
        valor: num(b.valor),
        competencia: b.competencia ? parseDataCivil(b.competencia) : null,
        vencimento: b.vencimento ? parseDataCivil(b.vencimento) : null,
        imovelId: b.imovelId ? +b.imovelId : null,
        empresaId: b.empresaId ? +b.empresaId : null,
        oportunidadeId: b.oportunidadeId ? +b.oportunidadeId : null,
      },
    }));
  }));

  // Duplicar: cópia prevista do lançamento (sem baixa/estorno herdados)
  r.post('/lancamentos/:id/duplicar', asyncHandler(async (req, res) => {
    const l = await prisma.lancamento.findUnique({ where: { id: +req.params.id } });
    if (!l) return res.status(404).json({ error: 'Lançamento não encontrado' });
    res.status(201).json(await prisma.lancamento.create({
      data: {
        tipo: l.tipo, categoria: l.categoria, descricao: l.descricao,
        pagador: l.pagador, beneficiario: l.beneficiario,
        valor: l.valor, competencia: l.competencia, vencimento: l.vencimento,
        imovelId: l.imovelId, empresaId: l.empresaId, oportunidadeId: l.oportunidadeId,
        criadoPorId: req.user.id,
      },
    }));
  }));

  // Comprovante (nota/recibo): arquivo privado, exige sessão para download
  r.post('/lancamentos/:id/comprovante', uploadComprovante.single('comprovante'), asyncHandler(async (req, res) => {
    const l = await prisma.lancamento.findUnique({ where: { id: +req.params.id } });
    if (!l) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório' });
    const anterior = l.comprovante;
    const atualizado = await prisma.lancamento.update({ where: { id: l.id }, data: { comprovante: req.file.filename } });
    if (anterior) { try { fs.unlinkSync(path.join(uploadDir, anterior)); } catch {} }
    res.json(atualizado);
  }));

  // Baixa (settlement): marca pago com data/valor/forma — preserva o lançamento
  r.post('/lancamentos/:id/baixar', asyncHandler(async (req, res) => {
    const l = await prisma.lancamento.findUnique({ where: { id: +req.params.id } });
    if (!l) return res.status(404).json({ error: 'Lançamento não encontrado' });
    if (l.status === 'estornado') return res.status(409).json({ error: 'Lançamento estornado' });
    if (l.status === 'pago') return res.status(409).json({ error: 'Lançamento já baixado' });
    const { pagoEm, valorPago, formaPagamento } = req.body || {};
    let pago = new Date();
    if (pagoEm) {
      const d = parseDataCivil(pagoEm);
      if (d == null) return res.status(400).json({ error: 'pagoEm inválido (AAAA-MM-DD)' });
      pago = d;
    }
    const vp = valorPago != null && valorPago !== '' ? num(valorPago) : num(l.valor);
    if (!validaValor(vp)) return res.status(400).json({ error: 'valorPago inválido' });
    if (formaPagamento && !FORMAS.has(formaPagamento)) return res.status(400).json({ error: 'Forma de pagamento inválida' });
    res.json(await prisma.lancamento.update({
      where: { id: l.id },
      data: { status: 'pago', pagoEm: pago, valorPago: vp, formaPagamento: formaPagamento || null },
    }));
  }));

  // Estorno: preserva o lançamento original (histórico financeiro)
  r.post('/lancamentos/:id/estornar', asyncHandler(async (req, res) => {
    const l = await prisma.lancamento.findUnique({ where: { id: +req.params.id } });
    if (!l) return res.status(404).json({ error: 'Lançamento não encontrado' });
    if (l.status === 'estornado') return res.status(409).json({ error: 'Já estornado' });
    res.json(await prisma.lancamento.update({
      where: { id: l.id },
      data: { status: 'estornado', estornadoEm: new Date(), estornoMotivo: String(req.body?.motivo || '').trim() || null },
    }));
  }));

  // Resumo: previsto x realizado, por tipo e por imóvel
  r.get('/resumo', asyncHandler(async (req, res) => {
    const todos = await prisma.lancamento.findMany({
      include: { imovel: { select: { id: true, codigo: true, titulo: true } } },
    });
    const ativos = todos.filter((l) => l.status !== 'estornado');
    const soma = (arr) => arr.reduce((s, l) => s + toCents(l.status === 'pago' ? (l.valorPago ?? l.valor) : l.valor), 0) / 100;
    const receita = (st) => soma(ativos.filter((l) => l.tipo === 'receita' && l.status === st));
    const despesa = (st) => soma(ativos.filter((l) => l.tipo === 'despesa' && l.status === st));
    const porImovelMap = new Map();
    for (const l of ativos) {
      if (!l.imovelId) continue;
      const cur = porImovelMap.get(l.imovelId) || { imovel: l.imovel, receita: 0, despesa: 0, impostos: 0, repasses: 0, pago: true };
      const v = toCents(l.status === 'pago' ? (l.valorPago ?? l.valor) : l.valor) / 100;
      cur[l.tipo] += v;
      if (l.categoria === 'imposto') cur.impostos += v;
      if (l.categoria === 'repasse') cur.repasses += v;
      if (l.status !== 'pago') cur.pago = false;
      porImovelMap.set(l.imovelId, cur);
    }
    const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0);
    const vencidos = ativos.filter((l) => l.status === 'previsto' && l.vencimento && l.vencimento < hoje);
    res.json({
      receitaPrevista: receita('previsto'),
      receitaRealizada: receita('pago'),
      despesaPrevista: despesa('previsto'),
      despesaRealizada: despesa('pago'),
      resultadoRealizado: receita('pago') - despesa('pago'),
      resultadoPrevisto: receita('previsto') - despesa('previsto'),
      vencidos: { qtd: vencidos.length, total: soma(vencidos) },
      // Resultado por imóvel: comissão líquida = receita bruta − despesas − impostos − repasses
      porImovel: [...porImovelMap.values()].map((p) => ({
        ...p,
        resultado: p.receita - p.despesa,
        comissaoLiquida: p.receita - p.despesa - p.impostos - p.repasses,
        situacao: p.pago ? 'concluido' : 'pendente',
      })).sort((a, b) => b.resultado - a.resultado),
    });
  }));

  return r;
};
