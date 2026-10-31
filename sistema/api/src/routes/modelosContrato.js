const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const { fail } = require('../lib/validar');

const CATEGORIAS = ['locacao', 'compra_venda', 'passagem_ponto', 'prestacao_servicos', 'confidencialidade', 'outro'];
const EXTENSOES = new Set(['.pdf', '.doc', '.docx', '.odt']);

// Biblioteca de modelos de contrato: todos consultam, só admin mantém.
module.exports = (prisma) => {
  const r = express.Router();
  r.use(auth);
  const uploadDir = path.join(__dirname, '..', '..', 'uploads');
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => (EXTENSOES.has(path.extname(file.originalname).toLowerCase())
      ? cb(null, true) : cb(new Error('Tipo de arquivo não permitido. Use PDF, Word (DOC, DOCX) ou ODT.'))),
  });
  const apagar = (arquivo) => { if (arquivo) { try { fs.unlinkSync(path.join(uploadDir, arquivo)); } catch {} } };
  // Nome original chega em latin1 no multipart
  const nomeOriginal = (file) => Buffer.from(file.originalname, 'latin1').toString('utf8');

  function pick(body = {}, existente) {
    const texto = (k) => (typeof body[k] === 'string' ? body[k].trim() : body[k] == null ? '' : fail(`Texto inválido: ${k}`));
    const d = {};
    if ('nome' in body || !existente) d.nome = texto('nome') || fail('Informe o nome do modelo');
    if ('categoria' in body) d.categoria = CATEGORIAS.includes(body.categoria) ? body.categoria : fail('Tipo de contrato inválido');
    if ('descricao' in body) d.descricao = texto('descricao') || null;
    return d;
  }

  r.get('/', asyncHandler(async (req, res) => {
    res.json(await prisma.modeloContrato.findMany({ orderBy: [{ categoria: 'asc' }, { nome: 'asc' }] }));
  }));

  r.post('/', auth.requireRole('admin'), upload.single('arquivo'), asyncHandler(async (req, res) => {
    try {
      if (!req.file) fail('Envie o arquivo do modelo');
      res.json(await prisma.modeloContrato.create({ data: { ...pick(req.body), arquivo: req.file.filename, arquivoNome: nomeOriginal(req.file) } }));
    } catch (e) { apagar(req.file?.filename); throw e; }
  }));

  r.put('/:id', auth.requireRole('admin'), upload.single('arquivo'), asyncHandler(async (req, res) => {
    try {
      const atual = await prisma.modeloContrato.findUnique({ where: { id: +req.params.id } });
      if (!atual) fail('Modelo não encontrado', 404);
      const data = pick(req.body, true);
      if (req.file) Object.assign(data, { arquivo: req.file.filename, arquivoNome: nomeOriginal(req.file), url: null });
      const salvo = await prisma.modeloContrato.update({ where: { id: atual.id }, data });
      if (req.file) apagar(atual.arquivo);
      res.json(salvo);
    } catch (e) { apagar(req.file?.filename); throw e; }
  }));

  r.delete('/:id', auth.requireRole('admin'), asyncHandler(async (req, res) => {
    const removido = await prisma.modeloContrato.delete({ where: { id: +req.params.id } });
    apagar(removido.arquivo);
    res.json({ ok: true });
  }));

  return r;
};
