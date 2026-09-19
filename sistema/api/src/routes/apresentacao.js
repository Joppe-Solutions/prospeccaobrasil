const express = require('express');
const QRCode = require('qrcode');
const { custoTotal } = require('../services/inteligencia');
const asyncHandler = require('../middleware/async');

const money = (v) => v == null ? 'R$ 0,00' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const num = (v, u = 'm²') => v == null ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' ' + u;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const DOC_LABELS = {
  planta: 'PLANTA\nPDF / DWG', inteligencia: 'INTELIGÊNCIA\nDE MERCADO', pre_analise: 'PRÉ-ANÁLISE',
  rig: 'RIG / HABITE-SE', avcb: 'AVCB', convencao: 'CONVENÇÃO DE\nCONDOMÍNIO', iptu_doc: 'IPTU',
  doc_locatario: 'DOCUMENTAÇÃO\nDO LOCATÁRIO', outro: 'DOCUMENTO',
};
const DOC_ICONS = {
  planta: 'M6 3 H14 L18 7 V21 H6 Z M14 3 V7 H18 M9 12 H15 M9 15 H13',
  inteligencia: 'M5 19 V11 M12 19 V5 M19 19 V13 M3 21 H21 M7 8 L11 4 M7 4 L11 8',
  pre_analise: 'M9 12 L11 14 L15 10 M12 3 A9 9 0 1 0 21 12 A9 9 0 0 0 12 3',
  rig: 'M4 21 V9 L12 4 L20 9 V21 M9 21 V14 H15 V21 M4 21 H20',
  avcb: 'M12 3 C12 3 6 8 6 13 A6 6 0 0 0 18 13 C18 8 12 3 12 3',
  convencao: 'M5 4 H19 V20 H5 Z M8 8 H16 M8 11 H16 M8 14 H12 M9 4 V2 M15 4 V2',
  iptu_doc: 'M7 3 H17 V21 H7 Z M10 8 H14 M10 12 H14 M10 16 H14',
  doc_locatario: 'M7 3 H17 V21 H7 Z M12 7 A1.8 1.8 0 1 1 12 10.6 A1.8 1.8 0 0 1 12 7 M9 16 C9 13.5 15 13.5 15 16',
  outro: 'M6 3 H14 L18 7 V21 H6 Z M14 3 V7 H18',
};

module.exports = (prisma) => {
  const r = express.Router();

  r.get('/:id', asyncHandler(async (req, res) => {
    const i = await prisma.imovel.findUnique({
      where: { id: +req.params.id },
      include: { fotos: { orderBy: [{ principal: 'desc' }, { ordem: 'asc' }] }, documentos: true },
    });
    if (!i) return res.status(404).send('Imóvel não encontrado');

    const foto = i.fotos[0];
    const end1 = [i.endereco, i.numero].filter(Boolean).join(', ') + (i.complemento ? ` – ${i.complemento}` : '');
    const end2 = `${i.bairro ? i.bairro.toUpperCase() + ' – ' : ''}${(i.cidade || '').toUpperCase().split(' ')[0] === i.cidade?.toUpperCase() ? i.bairro?.toUpperCase() + ' – ' + i.uf : i.cidade} `.replace(/\s+/g,' ');
    const cidadeUf = `${(i.bairro || '').toUpperCase()} – ${i.uf}${i.cep ? ` (CEP: ${i.cep})` : ''}`;
    const custo = custoTotal(i);
    const mapsUrl = i.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end1 + ', ' + i.cidade)}`;
    const qrData = await QRCode.toDataURL(i.googleDriveUrl || mapsUrl, { margin: 0, width: 300, color: { dark: '#0d2f2a', light: '#ffffff' } });
    const tipoLabel = i.tipo === 'venda' ? 'ATIVO COMERCIAL DISPONÍVEL PARA VENDA' : 'ATIVO COMERCIAL DISPONÍVEL PARA LOCAÇÃO';
    const docs = i.documentos.length ? i.documentos : ['planta','inteligencia','rig','avcb','convencao','iptu_doc','doc_locatario'].map(t => ({ tipo: t, nome: DOC_LABELS[t].replace(/\n/g,' ') }));

    const termos = [
      { ic: 'M4 17 L12 7 L20 17 M4 21 H20', label: 'CDU', sub: 'CESSÃO DE DIREITO DE USO\nCAPEX', v: money(i.cdu) },
      { ic: 'M4 21 V9 L12 4 L20 9 V21 M9 21 V13 H15 V21 M4 21 H20', label: i.tipo === 'venda' ? 'VALOR DE VENDA' : 'ALUGUEL', sub: '', v: money(i.tipo === 'venda' ? i.precoVenda : i.aluguel) },
      { ic: 'M6 21 V8 L12 4 L18 8 V21 M6 21 H18 M10 11 H14', label: 'IPTU / COTA', sub: String(new Date().getFullYear()), v: money(i.iptu) },
      { ic: 'M5 21 V6 L12 3 L19 6 V21 M5 21 H19 M9 10 H15 M9 14 H15', label: 'CONDOMÍNIO', sub: '', v: money(i.condominio) },
    ];

    const dims = [
      { l: 'PISO', v: num(i.pisoAreaVenda || i.areaUtil) },
      { l: 'ESTOQUE LINEAR', v: num(i.jirau) },
      { l: '', v: num(i.areaUtil) },
      { l: 'ESTOQUE IMPROVISADO', v: num(i.mezanino), ic: true },
      { l: 'FRENTE DE LOJA', v: i.frenteImovel ? num(i.frenteImovel, 'm') : '—', ic: true },
      { l: 'PÉ DIREITO LOJA', v: i.peDireito ? num(i.peDireito, 'm') : '—', ic: true },
    ];

    res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(i.codigo)} — ${esc(end1)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { font-family:'Helvetica Neue',Arial,sans-serif; background:#20302d; }
  .sheet { width:210mm; height:297mm; margin:20px auto; background:#12312d; color:#e9efe9; padding:30px 36px 26px; box-shadow:0 10px 50px rgba(0,0,0,.5); position:relative; overflow:hidden; }
  .gold { color:#e3c878; }

  .head-title { text-align:center; font-size:17px; letter-spacing:6px; font-weight:600; color:#e3c878; margin-bottom:26px; }
  .head-title::before { content:'●'; margin-right:10px; font-size:12px; vertical-align:2px; }

  .hero { display:flex; gap:26px; margin-bottom:22px; }
  .brand-col { width:38%; text-align:center; display:flex; flex-direction:column; align-items:center; }
  .brand-col img.logo { height:118px; }
  .brand-addr { font-size:10.5px; letter-spacing:2px; color:#cfd8cd; margin:14px 0 10px; line-height:1.7; }
  .flag { width:130px; margin:6px 0 12px; }
  .brand-quote { font-size:10.5px; letter-spacing:1.5px; color:#e3c878; margin-top:auto; }
  .photo-col { flex:1; }
  .photo-addr { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:8px; padding:10px 14px; text-align:center; font-size:12.5px; font-weight:700; letter-spacing:1px; margin-bottom:10px; }
  .photo-addr small { display:block; font-weight:400; letter-spacing:1px; opacity:.8; margin-top:3px; font-size:10px; }
  .photo { width:100%; height:250px; border-radius:10px; background:#2a423d url('${foto ? `/uploads/${foto.arquivo}` : ''}') center/cover; border:1px solid rgba(255,255,255,.12); }
  .gphotos { text-align:right; margin-top:8px; }
  .gphotos a { display:inline-flex; align-items:center; gap:6px; background:#fff; color:#333; border-radius:6px; padding:5px 10px; font-size:10px; font-weight:700; text-decoration:none; }

  .rule { border:0; border-top:1.5px solid rgba(255,255,255,.25); margin:18px 0; }

  .opex { display:flex; text-align:center; }
  .opex > div { flex:1; }
  .opex > div:first-child { border-right:1.5px solid rgba(255,255,255,.25); }
  .opex .tag { font-size:11px; letter-spacing:5px; color:#e3c878; }
  .opex .lbl { font-size:12px; letter-spacing:3px; color:#e3c878; margin-top:2px; }
  .opex .val { font-size:38px; font-weight:800; margin:6px 0 4px; }
  .opex .sub { font-size:9.5px; letter-spacing:2px; color:#e3c878; }

  .cols { display:flex; gap:0; }
  .col { flex:1; }
  .col:first-child { border-right:1.5px solid rgba(255,255,255,.25); padding-right:26px; }
  .col:last-child { padding-left:26px; }
  .sec-h { display:inline-block; border:1.5px solid rgba(255,255,255,.5); border-radius:6px; padding:7px 18px; font-size:11px; letter-spacing:4px; font-weight:700; color:#e3c878; margin:0 auto 18px; }
  .sec-c { text-align:center; }

  .term { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
  .term .ic { width:44px; height:44px; border-radius:50%; background:#e3c878; display:flex; align-items:center; justify-content:center; flex:none; }
  .term .ic svg { width:22px; height:22px; stroke:#12312d; fill:none; stroke-width:1.6; }
  .term .tx { flex:1; text-align:left; border-bottom:1px solid rgba(255,255,255,.3); padding-bottom:6px; }
  .term .tx .t { font-size:12px; font-weight:700; letter-spacing:1px; }
  .term .tx .s { font-size:8px; letter-spacing:1px; opacity:.75; white-space:pre-line; }
  .term .v { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:8px; padding:10px 16px; font-size:16px; font-weight:800; min-width:130px; text-align:center; }

  .dimrow { display:flex; gap:12px; margin-bottom:12px; align-items:stretch; }
  .dimbox { flex:1; }
  .dimbox .l { font-size:9.5px; letter-spacing:2px; color:#e3c878; text-align:center; margin-bottom:5px; min-height:12px; }
  .dimbox .v { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:8px; padding:11px 8px; font-size:17px; font-weight:800; text-align:center; }
  .dimbox .v.mini { font-size:14px; }
  .dim-ic { width:44px; display:flex; align-items:center; justify-content:center; flex:none; }
  .dim-ic svg { width:26px; height:26px; stroke:#e3c878; fill:none; stroke-width:1.5; }

  .docs-head { text-align:center; font-size:10.5px; letter-spacing:2px; color:#e3c878; margin-bottom:16px; }
  .docs-row { display:flex; align-items:flex-start; gap:8px; }
  .docs { display:flex; gap:10px; flex:1; flex-wrap:wrap; }
  .doc { width:70px; text-align:center; text-decoration:none; color:#e9efe9; }
  .doc .ic { width:56px; height:56px; margin:0 auto 6px; border:1.5px solid rgba(255,255,255,.4); border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.04); }
  .doc .ic svg { width:26px; height:26px; stroke:#e3c878; fill:none; stroke-width:1.4; }
  .doc .dl { font-size:7.5px; letter-spacing:.5px; font-weight:700; line-height:1.4; white-space:pre-line; }
  .qrbox { width:118px; flex:none; margin-left:14px; }
  .qrbox img { width:118px; height:118px; background:#fff; border-radius:10px; padding:6px; }
  .qrbox .cap { font-size:8px; letter-spacing:1px; text-align:center; margin-top:5px; color:#cfd8cd; }

  .footer { display:flex; margin-top:6px; }
  .footer > div { flex:1; }
  .footer > div:first-child { border-right:1.5px solid rgba(255,255,255,.25); }
  .footer > div:last-child { padding-left:30px; display:flex; flex-direction:column; justify-content:center; gap:10px; }
  .footer .ct { font-size:11px; letter-spacing:3px; color:#e3c878; text-align:center; margin-bottom:10px; }
  .footer .ln { font-size:12.5px; letter-spacing:1px; margin-bottom:4px; display:flex; align-items:center; gap:8px; }
  .footer svg { width:15px; height:15px; flex:none; }

  .print-btn { position:fixed; top:18px; right:18px; background:#e3c878; color:#12312d; border:0; padding:12px 20px; border-radius:10px; font-weight:700; font-size:13px; cursor:pointer; box-shadow:0 4px 16px rgba(0,0,0,.4); z-index:9; }
  @media print {
    body { background:#12312d; } .print-btn { display:none; }
    .sheet { margin:0; box-shadow:none; width:210mm; height:297mm; }
    .hero { flex-direction:row; } .brand-col { width:38%; }
    .opex, .cols, .footer { flex-direction:row; }
    .opex>div:first-child { border-right:1.5px solid rgba(255,255,255,.25); border-bottom:0; }
    .col:first-child { border-right:1.5px solid rgba(255,255,255,.25); border-bottom:0; padding-right:26px; }
    .col:last-child, .footer>div:last-child { padding-left:26px; }
    .footer>div:first-child { border-right:1.5px solid rgba(255,255,255,.25); border-bottom:0; }
    .opex .val { font-size:38px; }
    @page { size:A4 portrait; margin:0; }
  }
  @media (max-width:700px) {
    .sheet { width:100%; margin:0; padding:22px 16px; }
    .hero { flex-direction:column; } .brand-col { width:100%; }
    .opex,.cols,.footer { flex-direction:column; }
    .opex>div:first-child,.col:first-child,.footer>div:first-child { border-right:0; border-bottom:1.5px solid rgba(255,255,255,.25); padding-bottom:16px; margin-bottom:16px; padding-right:0; }
    .col:last-child,.footer>div:last-child { padding-left:0; }
    .opex .val { font-size:30px; }
  }
</style></head><body>
<button class="print-btn" onclick="window.print()">Salvar / Imprimir PDF</button>
<div class="sheet">
  <div class="head-title">ATIVO COMERCIAL DISPONÍVEL PARA ${i.tipo === 'venda' ? 'VENDA' : 'LOCAÇÃO'}</div>

  <div class="hero">
    <div class="brand-col">
      <img class="logo" src="/images/logo-full.png" alt="Prospecção Brasil" onerror="this.src='/images/logo-wide.png'">
      <div class="brand-addr">RUA VISCONDE DE PIRAJÁ, 495 – 5º ANDAR<br>IPANEMA – RJ</div>
      <img class="flag" src="/images/brazil-flag.webp" alt="Brasil">
      <div class="brand-quote">"QUALIDADE, COMPROMISSO DE TODOS."</div>
    </div>
    <div class="photo-col">
      <div class="photo-addr">${esc(end1.toUpperCase())}<small>${esc(cidadeUf)}</small></div>
      <div class="photo"></div>
      ${i.googleDriveUrl ? `<div class="gphotos"><a href="${esc(i.googleDriveUrl)}" target="_blank"><svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#0e8c7f" stroke-width="1.6"/><path d="M8 15 L12 7 L16 15 Z" fill="#0e8c7f"/></svg>Google Fotos</a></div>` : ''}
    </div>
  </div>

  <hr class="rule">

  <div class="opex">
    <div>
      <div class="tag">OPEX</div>
      <div class="lbl">${i.tipo === 'venda' ? 'VALOR DO ATIVO' : 'CUSTO TOTAL DA OPERAÇÃO'}</div>
      <div class="val">${i.tipo === 'venda' ? money(i.precoVenda) : money(custo)}</div>
      <div class="sub">${i.tipo === 'venda' ? 'ATIVO IMOBILIÁRIO' : 'ALUGUEL + IPTU/COTA + CONDOMÍNIO'}</div>
    </div>
    <div>
      <div class="tag">ABL</div>
      <div class="lbl">ÁREA BRUTA LOCÁVEL</div>
      <div class="val">${num(i.areaTotal)}</div>
      <div class="sub">${i.areaUtil ? `ÁREA ÚTIL ${num(i.areaUtil).toUpperCase()}` : '&nbsp;'}</div>
    </div>
  </div>

  <hr class="rule">

  <div class="cols">
    <div class="col">
      <div class="sec-c"><span class="sec-h">TERMOS COMERCIAIS</span></div>
      ${termos.map(t => `<div class="term">
        <div class="ic"><svg viewBox="0 0 24 24"><path d="${t.ic}"/></svg></div>
        <div class="tx"><div class="t">${esc(t.label)}</div>${t.sub ? `<div class="s">${esc(t.sub)}</div>` : ''}</div>
        <div class="v">${t.v}</div>
      </div>`).join('')}
    </div>
    <div class="col">
      <div class="sec-c"><span class="sec-h">DIMENSÕES</span></div>
      <div class="dimrow">
        <div class="dimbox"><div class="l">PISO</div><div class="v">${num(i.pisoAreaVenda || i.areaUtil)}</div></div>
        <div class="dimbox"><div class="l">ESTOQUE LINEAR</div><div class="v">${num(i.jirau)}</div></div>
      </div>
      <div class="dimrow">
        <div class="dimbox"><div class="l">&nbsp;</div><div class="v mini">${num(i.areaUtil)}</div></div>
        <div class="dim-ic"><svg viewBox="0 0 24 24"><path d="M4 21 V10 L12 5 L20 10 V21 M4 21 H20 M9 21 V14 H15 V21"/></svg></div>
      </div>
      <div class="dimrow">
        <div class="dimbox"><div class="l">${i.frenteImovel ? 'FRENTE DE LOJA' : ''}</div><div class="v mini">${i.frenteImovel ? num(i.frenteImovel,'m') : '—'}</div></div>
        <div class="dim-ic"><svg viewBox="0 0 24 24"><path d="M3 21 V8 L10 4 V21 M10 8 H21 V21 M10 21 H21 M6 12 H8 M6 16 H8"/></svg></div>
      </div>
      <div class="dimrow">
        <div class="dimbox"><div class="l">${i.peDireito ? 'PÉ DIREITO LOJA' : ''}</div><div class="v mini">${i.peDireito ? num(i.peDireito,'m') : '—'}</div></div>
        <div class="dim-ic"><svg viewBox="0 0 24 24"><path d="M4 21 V8 L12 4 L20 8 V21 M4 21 H20 M12 4 V21"/></svg></div>
      </div>
    </div>
  </div>

  <hr class="rule">

  <div class="docs-head">ACESSE OS ANEXOS PELOS ÍCONES ABAIXO OU PELO QR CODE AO LADO</div>
  <div class="docs-row">
    <div class="docs">
      ${docs.map(d => `<a class="doc" ${d.url || d.arquivo ? `href="${esc(d.url || `/uploads/${d.arquivo}`)}" target="_blank"` : ''}>
        <div class="ic"><svg viewBox="0 0 24 24"><path d="${DOC_ICONS[d.tipo] || DOC_ICONS.outro}"/></svg></div>
        <div class="dl">${esc(DOC_LABELS[d.tipo] || d.nome.toUpperCase())}</div>
      </a>`).join('')}
    </div>
    <div class="qrbox"><img src="${qrData}" alt="QR"><div class="cap">${i.googleDriveUrl ? 'GALERIA DE FOTOS' : 'LOCALIZAÇÃO'}</div></div>
  </div>

  <hr class="rule">

  <div class="footer">
    <div>
      <div class="ct">⬤&nbsp;&nbsp;CONTATO</div>
      <div class="ln"><svg viewBox="0 0 24 24" fill="none" stroke="#e3c878" stroke-width="1.6"><path d="M5 4 H9 L11 9 L8.5 10.5 A13 13 0 0 0 13.5 15.5 L15 13 L20 15 V19 A2 2 0 0 1 18 21 A16 16 0 0 1 3 6 A2 2 0 0 1 5 4"/></svg>LUIZ CLAUDIO P. &nbsp;(21) 9 9842-3232</div>
      <div class="ln"><svg viewBox="0 0 24 24" fill="none" stroke="#e3c878" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7 L12 13 L21 7"/></svg>EMAIL – comercial@prospeccaobrasil.com.br</div>
    </div>
    <div>
      <div class="ln"><svg viewBox="0 0 24 24" fill="none" stroke="#e3c878" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M3 12 H21 M12 3 C15 7 15 17 12 21 C9 17 9 7 12 3"/></svg>prospeccaobrasil.com.br</div>
      <div class="ln"><span class="gold" style="font-size:10px">●</span>VISITA AO ATIVO COMERCIAL, COM AVISO PRÉVIO</div>
    </div>
  </div>
</div>
</body></html>`);
  }));

  return r;
};
