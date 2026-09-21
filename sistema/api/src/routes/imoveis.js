const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const { gerarAnalise } = require('../services/inteligencia');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const IMOVEL_FIELDS = [
  'codigo', 'titulo', 'tipo', 'categoria', 'status', 'endereco', 'numero', 'complemento',
  'bairro', 'cidade', 'uf', 'cep', 'latitude', 'longitude',
  'areaTotal', 'areaUtil', 'pisoAreaVenda', 'jirau', 'mezanino', 'peDireito',
  'frenteImovel', 'cdu', 'aluguel', 'condominio', 'iptu', 'precoVenda',
  'periodoContrato', 'proprietario', 'telProprietario', 'proprietarioId', 'parceiroId',
  'googleMapsUrl', 'googleDriveUrl', 'descricao', 'observacoes',
];
const NUM_FIELDS = new Set([
  'areaTotal', 'areaUtil', 'pisoAreaVenda', 'jirau', 'mezanino', 'peDireito',
  'frenteImovel', 'cdu', 'aluguel', 'condominio', 'iptu', 'precoVenda',
  'latitude', 'longitude',
]);
const ID_FIELDS = new Set(['proprietarioId', 'parceiroId']);

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
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        if (NUM_FIELDS.has(k) || ID_FIELDS.has(k)) d[k] = num(body[k]);
        else d[k] = body[k];
      }
    }
    return d;
  };

  r.use(auth);

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
    res.json(await prisma.imovel.findMany({
      where, orderBy: { criadoEm: 'desc' },
      include: {
        fotos: { where: { principal: true }, take: 1 },
        proprietarioRel: { select: { id: true, nome: true } },
        parceiro: { select: { id: true, nome: true } },
        _count: { select: { fotos: true, documentos: true } },
      },
    }));
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const i = await prisma.imovel.findUnique({
      where: { id: +req.params.id },
      include: {
        fotos: { orderBy: [{ principal: 'desc' }, { ordem: 'asc' }] },
        documentos: { orderBy: { criadoEm: 'desc' } },
        analises: { orderBy: { criadoEm: 'desc' }, take: 5 },
        oportunidades: { include: { empresa: true }, orderBy: { criadoEm: 'desc' } },
        despesas: { orderBy: { criadoEm: 'desc' } },
        proprietarioRel: true,
        parceiro: true,
      },
    });
    if (!i) return res.status(404).json({ error: 'Não encontrado' });
    res.json(i);
  }));

  r.post('/', asyncHandler(async (req, res) => {
    const d = pickImovel(req.body);
    if (!d.endereco || !d.cidade) return res.status(400).json({ error: 'Endereço e cidade são obrigatórios' });
    // Código sequencial baseado no maior sufixo existente, com retry em colisão (P2002)
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      if (!d.codigo || tentativa > 0) {
        const ultimo = await prisma.imovel.findFirst({
          where: { codigo: { startsWith: 'PB-' } },
          orderBy: { codigo: 'desc' },
          select: { codigo: true },
        });
        const seq = (parseInt((ultimo?.codigo || '').replace('PB-', ''), 10) || 0) + 1;
        d.codigo = `PB-${String(seq).padStart(3, '0')}`;
      }
      try {
        return res.json(await prisma.imovel.create({ data: d }));
      } catch (e) {
        if (e.code === 'P2002' && tentativa < 4) { d.codigo = null; continue; }
        if (e.code === 'P2002') return res.status(409).json({ error: 'Código de imóvel já existe. Tente novamente.' });
        throw e;
      }
    }
  }));

  r.put('/:id', asyncHandler(async (req, res) => {
    res.json(await prisma.imovel.update({ where: { id: +req.params.id }, data: pickImovel(req.body) }));
  }));

  r.delete('/:id', asyncHandler(async (req, res) => {
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
    for (const f of [...(arquivos?.fotos || []), ...(arquivos?.documentos || [])]) {
      if (f.arquivo) { try { fs.unlinkSync(path.join(uploadDir, f.arquivo)); } catch {} }
    }
    await prisma.imovel.delete({ where: { id } });
    res.json({ ok: true });
  }));

  // Fotos
  r.post('/:id/fotos', upload.array('fotos', 10), asyncHandler(async (req, res) => {
    const id = +req.params.id;
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
      try { fs.unlinkSync(path.join(uploadDir, f.arquivo)); } catch {}
      await prisma.imovelFoto.delete({ where: { id: f.id } });
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
    const { tipo, nome, url } = req.body;
    res.json(await prisma.imovelDocumento.create({
      data: { imovelId: +req.params.id, tipo: tipo || 'outro', nome: nome || req.file?.originalname || url || 'Documento', url: url || null, arquivo: req.file?.filename || null },
    }));
  }));

  r.delete('/:id/documentos/:docId', asyncHandler(async (req, res) => {
    const imovelId = +req.params.id;
    const d = await prisma.imovelDocumento.findFirst({ where: { id: +req.params.docId, imovelId } });
    if (d) {
      if (d.arquivo) { try { fs.unlinkSync(path.join(uploadDir, d.arquivo)); } catch {} }
      await prisma.imovelDocumento.delete({ where: { id: d.id } });
    }
    res.json({ ok: true });
  }));

  // Despesas
  r.get('/:id/despesas', asyncHandler(async (req, res) => {
    res.json(await prisma.imovelDespesa.findMany({
      where: { imovelId: +req.params.id },
      orderBy: { criadoEm: 'desc' },
    }));
  }));

  r.post('/:id/despesas', asyncHandler(async (req, res) => {
    const imovelId = +req.params.id;
    const imovel = await prisma.imovel.findUnique({ where: { id: imovelId } });
    if (!imovel) return res.status(404).json({ error: 'Imóvel não encontrado' });
    const { descricao, valor, data } = req.body || {};
    if (!descricao || !String(descricao).trim()) return res.status(400).json({ error: 'Descrição obrigatória' });
    const v = num(valor);
    if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return res.status(400).json({ error: 'Valor obrigatório' });
    if (v <= 0) return res.status(400).json({ error: 'Valor deve ser maior que zero. Para estornos, exclua o lançamento.' });
    // Data civil: armazena meio-dia UTC para não deslocar o dia no fuso de exibição (America/Sao_Paulo)
    const dataCivil = data ? (() => { const m = String(data).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : new Date(data); })() : null;
    res.json(await prisma.imovelDespesa.create({
      data: {
        imovelId,
        descricao: String(descricao).trim(),
        valor: v,
        data: dataCivil,
      },
    }));
  }));

  r.delete('/:id/despesas/:despesaId', asyncHandler(async (req, res) => {
    const imovelId = +req.params.id;
    const d = await prisma.imovelDespesa.findFirst({ where: { id: +req.params.despesaId, imovelId } });
    if (d) await prisma.imovelDespesa.delete({ where: { id: d.id } });
    res.json({ ok: true });
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
