const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const { requireRole } = auth;
const asyncHandler = require('../middleware/async');
const paginate = require('../lib/paginate');
const { gerarAnalise } = require('../services/inteligencia');
const { fail, urlHttp } = require('../lib/validar');
const { avaliar, DEMANDA_ATIVA, IMOVEL_OFERTAVEL } = require('../lib/compatibilidade');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const IMOVEL_FIELDS = [
  'vagas', 'acessibilidade', 'infraestrutura', 'restricoesUso', 'luvas', 'valorPonto', 'carenciaMeses', 'codigo', 'titulo', 'tipo', 'categoria', 'status', 'endereco', 'numero', 'complemento',
  'bairro', 'cidade', 'uf', 'cep', 'latitude', 'longitude',
  'areaTotal', 'areaUtil', 'pisoAreaVenda', 'jirau', 'mezanino', 'peDireito',
  'frenteImovel', 'cdu', 'aluguel', 'condominio', 'iptu', 'precoVenda',
  'periodoContrato', 'proprietario', 'telProprietario', 'proprietarioId', 'parceiroId',
  'googleMapsUrl', 'googleDriveUrl', 'descricao', 'observacoes',
];
const NUM_FIELDS = new Set([
  'vagas', 'luvas', 'valorPonto', 'carenciaMeses',
  'areaTotal', 'areaUtil', 'pisoAreaVenda', 'jirau', 'mezanino', 'peDireito',
  'frenteImovel', 'cdu', 'aluguel', 'condominio', 'iptu', 'precoVenda',
  'latitude', 'longitude',
]);
const ID_FIELDS = new Set(['proprietarioId', 'parceiroId']);
const INT_FIELDS = new Set(['vagas', 'carenciaMeses']);
const ENUMS = {
  tipo: ['locacao', 'venda', 'passagem_ponto'],
  categoria: ['loja', 'predio', 'terreno', 'outro'],
  status: ['disponivel', 'negociacao', 'locado', 'vendido', 'inativo'],
};
const URL_FIELDS = new Set(['googleMapsUrl', 'googleDriveUrl']);
const OBRIGATORIOS = ['endereco', 'cidade'];
const DOC_TIPOS = ['planta', 'inteligencia', 'pre_analise', 'rig', 'avcb', 'convencao', 'iptu_doc', 'outro'];

module.exports = (prisma) => {
  const r = express.Router();
  const uploadDir = path.join(__dirname, '..', '..', 'uploads');
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
      },
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) return cb(null, true);
      cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF.'));
    },
  });

  const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v));
  const pickImovel = (body = {}) => {
    const d = {};
    for (const k of IMOVEL_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
      let v = body[k];
      if (ID_FIELDS.has(k)) {
        v = num(v);
        if (v !== null && (!Number.isSafeInteger(v) || v < 1)) fail(`Vínculo inválido: ${k}`);
      } else if (NUM_FIELDS.has(k)) {
        v = num(v);
        const coordenada = k === 'latitude' || k === 'longitude';
        if (v !== null && (!Number.isFinite(v) || (!coordenada && v < 0) || (INT_FIELDS.has(k) && !Number.isSafeInteger(v)))) fail(`Valor inválido: ${k}`);
      } else {
        if (v !== null && typeof v !== 'string') fail(`Texto inválido: ${k}`);
        v = typeof v === 'string' ? v.trim() : v;
        if (ENUMS[k]) {
          // categoria é opcional; tipo e status não
          if (!v && k === 'categoria') v = null;
          else if (!ENUMS[k].includes(v)) fail(`Opção inválida: ${k}`);
        } else if (URL_FIELDS.has(k)) v = urlHttp(v);
        else if (OBRIGATORIOS.includes(k) && !v) fail('Endereço e cidade são obrigatórios');
        else if (v === '' && k !== 'codigo') v = null;
      }
      d[k] = v;
    }
    return d;
  };
  const imovelOu404 = async (id) => (await prisma.imovel.findUnique({ where: { id }, select: { id: true } })) || fail('Imóvel não encontrado', 404);

  r.use(auth);

  const demandasAtivas = (include) => prisma.demanda.findMany({
    where: { status: { in: DEMANDA_ATIVA } },
    ...(include ? { include } : {}),
  });

  r.get('/', asyncHandler(async (req, res) => {
    const { q, status, tipo, cidade, categoria } = req.query;
    const where = {};
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = categoria;
    if (cidade) where.cidade = { contains: cidade };
    if (q) where.OR = [
      { codigo: { contains: q } }, { endereco: { contains: q } },
      { bairro: { contains: q } }, { titulo: { contains: q } }, { cidade: { contains: q } },
    ];
    // Coluna "Diretrizes" da listagem: quantas demandas ativas cada imóvel atende
    const demandas = await demandasAtivas();
    const comDiretrizes = (i) => ({
      ...i,
      demandasCompativeis: IMOVEL_OFERTAVEL.includes(i.status)
        ? demandas.filter((d) => avaliar(i, d).nivel === 'compativel').length
        : null,
    });
    await paginate(req, res, prisma.imovel, {
      where, orderBy: { criadoEm: 'desc' },
      include: {
        fotos: { where: { principal: true }, take: 1 },
        proprietarioRel: { select: { id: true, nome: true } },
        parceiro: { select: { id: true, nome: true } },
        _count: { select: { fotos: true, documentos: true } },
      },
    }, comDiretrizes);
  }));

  // Demandas cujas diretrizes o imóvel atende (ou quase), com o detalhe por critério
  r.get('/:id/demandas-compativeis', asyncHandler(async (req, res) => {
    const imovel = await prisma.imovel.findUnique({
      where: { id: +req.params.id },
      include: { oportunidades: { select: { id: true, demandaId: true, empresaId: true, etapa: true } } },
    });
    if (!imovel) return res.status(404).json({ error: 'Não encontrado' });
    const ordem = { compativel: 0, parcial: 1 };
    const itens = (await demandasAtivas({ empresa: { select: { id: true, nome: true } } }))
      .map((d) => {
        const a = avaliar(imovel, d);
        const oportunidade = imovel.oportunidades.find((o) => o.demandaId === d.id) || null;
        return { id: d.id, titulo: d.titulo, tipo: d.tipo, status: d.status, empresa: d.empresa, oportunidade, ...a };
      })
      .filter((d) => d.nivel !== 'incompativel')
      .sort((a, b) => ordem[a.nivel] - ordem[b.nivel] || b.atende - a.atende);
    res.json({
      imovel: { id: imovel.id, codigo: imovel.codigo, status: imovel.status },
      ofertavel: IMOVEL_OFERTAVEL.includes(imovel.status),
      demandas: itens,
    });
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const i = await prisma.imovel.findUnique({
      where: { id: +req.params.id },
      include: {
        fotos: { orderBy: [{ principal: 'desc' }, { ordem: 'asc' }] },
        documentos: { orderBy: { criadoEm: 'desc' } },
        analises: { orderBy: { criadoEm: 'desc' }, take: 5 },
        oportunidades: { include: { empresa: true, demanda: true }, orderBy: { criadoEm: 'desc' } },
        // despesas são financeiras: só admin recebe no payload
        ...(req.user.role === 'admin' ? { despesas: { orderBy: { criadoEm: 'desc' } } } : {}),
        proprietarioRel: true,
        parceiro: true,
      },
    });
    if (!i) return res.status(404).json({ error: 'Não encontrado' });
    res.json(i);
  }));

  let seqInit;
  const proximoCodigo = async () => {
    // Inicializa a sequência no maior sufixo numérico existente (uma vez por processo)
    if (!seqInit) seqInit = (async () => {
      const codigos = await prisma.imovel.findMany({ select: { codigo: true } });
      const max = codigos.reduce((m, c) => {
        const mm = /^PB-(\d+)$/.exec(c.codigo || '');
        return mm ? Math.max(m, +mm[1]) : m;
      }, 0);
      await prisma.sequencia.upsert({
        where: { nome: 'imovel' },
        create: { nome: 'imovel', valor: max },
        update: {},
      });
    })();
    await seqInit;
    // Incremento atômico no banco — imune a concorrência, exclusões e 999→1000
    const atual = await prisma.sequencia.update({
      where: { nome: 'imovel' },
      data: { valor: { increment: 1 } },
    });
    return `PB-${String(atual.valor).padStart(3, '0')}`;
  };

  r.post('/', asyncHandler(async (req, res) => {
    const d = pickImovel(req.body);
    if (!d.endereco || !d.cidade) return res.status(400).json({ error: 'Endereço e cidade são obrigatórios' });

    if (d.codigo) {
      // Código explícito: duplicado é conflito, nunca substituído silenciosamente
      try {
        const criado = await prisma.imovel.create({ data: d });
        // Código manual acima da sequência a reposiciona (PB-999 manual → próximo é PB-1000+)
        const mm = /^PB-(\d+)$/.exec(d.codigo);
        if (mm) {
          await prisma.sequencia.updateMany({
            where: { nome: 'imovel', valor: { lt: +mm[1] } },
            data: { valor: +mm[1] },
          });
        }
        return res.json(criado);
      } catch (e) {
        if (e.code === 'P2002') return res.status(409).json({ error: `Código ${d.codigo} já existe` });
        throw e;
      }
    }

    for (let tentativa = 0; tentativa < 5; tentativa++) {
      d.codigo = await proximoCodigo();
      try {
        return res.json(await prisma.imovel.create({ data: d }));
      } catch (e) {
        if (e.code === 'P2002' && tentativa < 4) continue; // código manual à frente da sequência
        if (e.code === 'P2002') return res.status(409).json({ error: 'Conflito ao gerar código. Tente novamente.' });
        throw e;
      }
    }
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    res.json(await prisma.imovel.update({ where: { id: +req.params.id }, data: pickImovel(req.body) }));
  }));

  r.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
    const id = +req.params.id;
    const [despesas, oportunidades] = await Promise.all([
      prisma.imovelDespesa.count({ where: { imovelId: id } }),
      prisma.oportunidade.count({ where: { imovelId: id } }),
    ]);
    if (despesas > 0 || oportunidades > 0) {
      return res.status(409).json({
        error: 'Imóvel possui despesas ou oportunidades vinculadas. Use o status "inativo" para arquivar sem perder o histórico.',
      });
    }
    const arquivos = await prisma.imovel.findUnique({
      where: { id },
      include: { fotos: { select: { arquivo: true } }, documentos: { select: { arquivo: true } } },
    });
    await prisma.imovel.delete({ where: { id } });
    // Arquivos removidos só depois de confirmada a exclusão no banco
    for (const f of [...(arquivos?.fotos || []), ...(arquivos?.documentos || [])]) {
      if (f.arquivo) { try { fs.unlinkSync(path.join(uploadDir, f.arquivo)); } catch {} }
    }
    res.json({ ok: true });
  }));

  // Fotos
  r.post('/:id/fotos', upload.array('fotos', 10), asyncHandler(async (req, res) => {
    const id = +req.params.id;
    if (!(await prisma.imovel.findUnique({ where: { id }, select: { id: true } }))) {
      for (const f of req.files || []) { try { fs.unlinkSync(f.path); } catch {} }
      return res.status(404).json({ error: 'Imóvel não encontrado' });
    }
    const count = await prisma.imovelFoto.count({ where: { imovelId: id } });
    const criadas = await Promise.all((req.files || []).map((f, idx) =>
      prisma.imovelFoto.create({
        data: { imovelId: id, arquivo: f.filename, ordem: count + idx, principal: count === 0 && idx === 0, legenda: req.body.legenda || null },
      })));
    res.json(criadas);
  }));

  r.delete('/:id/fotos/:fotoId', asyncHandler(async (req, res) => {
    const imovelId = +req.params.id;
    const f = await prisma.imovelFoto.findFirst({ where: { id: +req.params.fotoId, imovelId } });
    if (f) {
      await prisma.imovelFoto.delete({ where: { id: f.id } });
      try { fs.unlinkSync(path.join(uploadDir, f.arquivo)); } catch {}
      // Se a foto excluída era a principal, promove a próxima
      if (f.principal) {
        const proxima = await prisma.imovelFoto.findFirst({ where: { imovelId }, orderBy: { ordem: 'asc' } });
        if (proxima) await prisma.imovelFoto.update({ where: { id: proxima.id }, data: { principal: true } });
      }
    }
    res.json({ ok: true });
  }));

  r.post('/:id/fotos/:fotoId/principal', asyncHandler(async (req, res) => {
    const imovelId = +req.params.id;
    const fotoId = +req.params.fotoId;
    const f = await prisma.imovelFoto.findFirst({ where: { id: fotoId, imovelId } });
    if (!f) return res.status(404).json({ error: 'Foto não encontrada' });
    await prisma.imovelFoto.updateMany({ where: { imovelId }, data: { principal: false } });
    res.json(await prisma.imovelFoto.update({ where: { id: fotoId }, data: { principal: true } }));
  }));

  // Documentos (links ou arquivos)
  r.post('/:id/documentos', upload.single('arquivo'), asyncHandler(async (req, res) => {
    const { tipo = 'outro', nome } = req.body;
    try {
      await imovelOu404(+req.params.id);
      if (!DOC_TIPOS.includes(tipo)) fail('Tipo de documento inválido');
      const url = urlHttp(req.body.url);
      if (!url && !req.file) fail('Envie um arquivo ou informe um link');
      res.json(await prisma.imovelDocumento.create({
        data: { imovelId: +req.params.id, tipo, nome: String(nome || '').trim() || req.file?.originalname || url, url, arquivo: req.file?.filename || null },
      }));
    } catch (e) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
      throw e;
    }
  }));

  r.delete('/:id/documentos/:docId', asyncHandler(async (req, res) => {
    const imovelId = +req.params.id;
    const d = await prisma.imovelDocumento.findFirst({ where: { id: +req.params.docId, imovelId } });
    if (d) {
      await prisma.imovelDocumento.delete({ where: { id: d.id } });
      if (d.arquivo) { try { fs.unlinkSync(path.join(uploadDir, d.arquivo)); } catch {} }
    }
    res.json({ ok: true });
  }));

  // Despesas — financeiro: restrito a admin em todas as operações
  r.get('/:id/despesas', requireRole('admin'), asyncHandler(async (req, res) => {
    res.json(await prisma.imovelDespesa.findMany({
      where: { imovelId: +req.params.id },
      orderBy: { criadoEm: 'desc' },
    }));
  }));

  r.post('/:id/despesas', requireRole('admin'), asyncHandler(async (req, res) => {
    const imovelId = +req.params.id;
    const imovel = await prisma.imovel.findUnique({ where: { id: imovelId } });
    if (!imovel) return res.status(404).json({ error: 'Imóvel não encontrado' });
    const { descricao, valor, data } = req.body || {};
    if (!descricao || !String(descricao).trim()) return res.status(400).json({ error: 'Descrição obrigatória' });
    const v = num(valor);
    if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return res.status(400).json({ error: 'Valor obrigatório' });
    if (v <= 0) return res.status(400).json({ error: 'Valor deve ser maior que zero. Para correções, use estorno.' });
    // Moeda: no máximo 2 casas decimais (centavos)
    if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-9) return res.status(400).json({ error: 'Valor deve ter no máximo 2 casas decimais' });
    // Data civil estrita: formato YYYY-MM-DD e dia/mês/ano reais
    let dataCivil = null;
    if (data) {
      const m = String(data).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return res.status(400).json({ error: 'Data deve estar no formato AAAA-MM-DD' });
      const [y, mo, dd] = [+m[1], +m[2], +m[3]];
      const dt = new Date(Date.UTC(y, mo - 1, dd, 12));
      if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== dd) {
        return res.status(400).json({ error: 'Data inválida' });
      }
      dataCivil = dt;
    }
    res.json(await prisma.imovelDespesa.create({
      data: {
        imovelId,
        descricao: String(descricao).trim(),
        valor: v,
        data: dataCivil,
        criadoPorId: req.user.id,
      },
    }));
  }));

  // Estorno preserva histórico: marca o lançamento, não apaga
  r.post('/:id/despesas/:despesaId/estornar', requireRole('admin'), asyncHandler(async (req, res) => {
    const imovelId = +req.params.id;
    const { motivo } = req.body || {};
    const d = await prisma.imovelDespesa.findFirst({ where: { id: +req.params.despesaId, imovelId } });
    if (!d) return res.status(404).json({ error: 'Despesa não encontrada' });
    if (d.estornada) return res.status(409).json({ error: 'Despesa já estornada' });
    res.json(await prisma.imovelDespesa.update({
      where: { id: d.id },
      data: { estornada: true, estornadoEm: new Date(), estornoMotivo: String(motivo || '').trim() || null },
    }));
  }));

  // Despesa não é apagada — o histórico financeiro é preservado via estorno
  r.delete('/:id/despesas/:despesaId', requireRole('admin'), asyncHandler(async (req, res) => {
    const d = await prisma.imovelDespesa.findFirst({ where: { id: +req.params.despesaId, imovelId: +req.params.id } });
    if (!d) return res.status(404).json({ error: 'Despesa não encontrada' });
    return res.status(409).json({ error: 'Lançamentos financeiros não são excluídos. Use o estorno para reverter.' });
  }));

  // Inteligência de mercado
  r.post('/:id/analise', asyncHandler(async (req, res) => {
    const i = await prisma.imovel.findUnique({ where: { id: +req.params.id } });
    if (!i) return res.status(404).json({ error: 'Não encontrado' });
    const a = await gerarAnalise(i);
    res.json(await prisma.analiseMercado.create({
      data: { imovelId: i.id, score: a.score, resumo: a.resumo, conteudoJson: JSON.stringify(a.conteudo), modelo: a.modelo },
    }));
  }));

  return r;
};
