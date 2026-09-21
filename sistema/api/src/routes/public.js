const express = require('express');
const { custoTotal } = require('../services/inteligencia');
const asyncHandler = require('../middleware/async');
const { DOC_PUBLICOS } = require('../lib/publicDocs');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limit simples para captação pública (5 req / 10 min por IP)
const leadAttempts = new Map();
function leadLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const rec = leadAttempts.get(ip) || { n: 0, reset: now + 10 * 60 * 1000 };
  if (now > rec.reset) { rec.n = 0; rec.reset = now + 10 * 60 * 1000; }
  rec.n++;
  leadAttempts.set(ip, rec);
  if (rec.n > 5) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  next();
}

module.exports = (prisma) => {
  const r = express.Router();

  // Dados públicos do imóvel para a página de apresentação
  r.get('/imoveis/:id', asyncHandler(async (req, res) => {
    const i = await prisma.imovel.findUnique({
      where: { id: +req.params.id },
      include: {
        fotos: { orderBy: [{ principal: 'desc' }, { ordem: 'asc' }] },
        documentos: true,
        analises: { orderBy: { criadoEm: 'desc' }, take: 1 },
      },
    });
    if (!i || i.status === 'inativo') return res.status(404).json({ error: 'Não encontrado' });

    const {
      proprietario,
      telProprietario,
      observacoes,
      documentos,
      googleDriveUrl,
      ...safe
    } = i;

    res.json({
      ...safe,
      documentos: (documentos || [])
        .filter((d) => DOC_PUBLICOS.has(d.tipo))
        .map(({ id, tipo, nome, url, arquivo, criadoEm }) => ({ id, tipo, nome, url, arquivo, criadoEm })),
      custoTotal: custoTotal(i),
    });
  }));

  // Captação pública de leads (formulário da landing). Sem autenticação, com rate limit.
  r.post('/leads', leadLimiter, asyncHandler(async (req, res) => {
    const { nome, telefone, email, interesse, mensagem, origem } = req.body || {};
    const nomeLimpo = String(nome || '').trim();
    const telLimpo = String(telefone || '').trim();
    const emailLimpo = String(email || '').trim().toLowerCase();

    if (!nomeLimpo || nomeLimpo.length < 2) return res.status(400).json({ error: 'Nome obrigatório' });
    if (!telLimpo && !emailLimpo) return res.status(400).json({ error: 'Informe telefone ou e-mail' });
    if (emailLimpo && !EMAIL_RE.test(emailLimpo)) return res.status(400).json({ error: 'E-mail inválido' });

    // Deduplicação: mesmo telefone/e-mail nas últimas 24h reutiliza o lead existente
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existente = await prisma.lead.findFirst({
      where: {
        criadoEm: { gte: ontem },
        OR: [
          ...(telLimpo ? [{ telefone: telLimpo }] : []),
          ...(emailLimpo ? [{ email: emailLimpo }] : []),
        ],
      },
    });
    if (existente) {
      return res.json({ ok: true, leadId: existente.id, duplicado: true });
    }

    const lead = await prisma.lead.create({
      data: {
        nome: nomeLimpo,
        telefone: telLimpo || null,
        email: emailLimpo || null,
        interesse: String(interesse || '').trim() || null,
        observacoes: String(mensagem || '').trim() || null,
        origem: origem === 'anuncio' || origem === 'indicacao' ? origem : 'site',
        status: 'novo',
      },
    });
    res.status(201).json({ ok: true, leadId: lead.id });
  }));

  return r;
};
