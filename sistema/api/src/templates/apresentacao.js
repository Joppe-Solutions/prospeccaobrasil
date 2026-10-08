const { Prisma } = require('@prisma/client');
const { DOC_PUBLICOS } = require('../lib/publicDocs');
const styles = require('./apresentacao.styles');

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const present = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const money = value => present(value) ? Number(value).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
}) : 'Sob consulta';
const measure = (value, unit = 'm²') => present(value)
  ? `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`
  : 'Não informada';
const uploadUrl = filename => `/uploads/${encodeURIComponent(filename)}`;
function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
const address = i => [i.endereco, i.numero].filter(Boolean).join(', ') + (i.complemento ? ` - ${i.complemento}` : '');
function locationUrl(i) {
  return safeUrl(i.googleMapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address(i), i.bairro, i.cidade, i.uf, i.cep].filter(Boolean).join(', '))}`;
}
const labels = {
  planta: 'Planta do imóvel', inteligencia: 'Inteligência de mercado', rig: 'RIG / Habite-se',
  avcb: 'AVCB', convencao: 'Convenção de condomínio', iptu_doc: 'IPTU',
};
const statuses = { disponivel: 'Disponível', negociacao: 'Em negociação', locado: 'Locado', vendido: 'Vendido' };
const categories = { loja: 'Loja', predio: 'Prédio', terreno: 'Terreno', outro: 'Imóvel comercial' };

// Mapa do endereço: tiles OSM centralizados no ponto do imóvel, com marcador.
function mapFigure(i, m) {
  const tiles = m.tiles.map(t => `<img src="https://tile.openstreetmap.org/${m.z}/${t.x}/${t.y}.png" alt="" width="256" height="256" style="left:${t.left}px;top:${t.top}px" crossorigin="anonymous">`).join('');
  return `<figure class="hero-map"><a class="map" href="${esc(locationUrl(i))}" target="_blank" rel="noopener noreferrer" aria-label="Abrir a localização do imóvel no mapa">
<span class="map-tiles" style="width:${m.w}px;height:${m.h}px;transform:translate(${-m.px.toFixed(1)}px,${-m.py.toFixed(1)}px)">${tiles}</span>
<svg class="map-pin" width="30" height="40" viewBox="0 0 30 40" aria-hidden="true"><path d="M15 39C15 39 28 23.5 28 14A13 13 0 0 0 2 14C2 23.5 15 39 15 39Z" fill="#153c34" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#d5ad62"/></svg>
<span class="map-attr">© OpenStreetMap</span></a><figcaption>Localização aproximada<span>${esc([i.bairro, i.cidade].filter(Boolean).join(' · '))}</span></figcaption></figure>`;
}

function renderApresentacao(i, qrData, { completa = false, mapa = null } = {}) {
  const sale = i.tipo === 'venda';
  const deal = { venda: 'Venda', passagem_ponto: 'Passagem de ponto' }[i.tipo] || 'Locação';
  const photos = (i.fotos || []).filter(f => f.arquivo);
  const docs = (i.documentos || []).filter(d => DOC_PUBLICOS.has(d.tipo)).map(d => ({
    ...d, href: d.arquivo ? uploadUrl(d.arquivo) : safeUrl(d.url),
  })).filter(d => d.href);
  const completeCost = [i.aluguel, i.condominio, i.iptu].every(present);
  const cost = completeCost ? [i.aluguel, i.condominio, i.iptu]
    .reduce((sum, value) => sum.plus(String(value)), new Prisma.Decimal(0)).toString() : null;
  const date = new Date(i.atualizadoEm || i.criadoEm);
  const updated = Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const subtitle = [i.bairro, [i.cidade, i.uf].filter(Boolean).join(' / '), i.cep ? `CEP ${i.cep}` : ''].filter(Boolean).join(' · ');
  const rows = [
    [sale ? 'Valor de venda' : 'Aluguel', money(sale ? i.precoVenda : i.aluguel)],
    ['Condomínio', money(i.condominio)], ['IPTU / cota cadastrada', money(i.iptu)],
    ['Cessão de direito de uso (CDU)', money(i.cdu)],
    ...(present(i.valorPonto) ? [['Passagem de ponto', money(i.valorPonto)]] : []),
  ];
  const areas = (i.areas || []).map(a => [a.nome, measure(a.area)]);
  const dimensions = [['Área bruta locável (ABL)', measure(i.areaTotal)], ['Área útil', measure(i.areaUtil)],
    ...(areas.length ? areas : [['Piso / área de venda', measure(i.pisoAreaVenda)], ['Jirau', measure(i.jirau)], ['Mezanino', measure(i.mezanino)]]),
    ['Frente', measure(i.frenteImovel, 'm')], ['Pé-direito', measure(i.peDireito, 'm')], ...(present(i.vagas) ? [['Vagas', String(i.vagas)]] : [])];
  const header = `<header class="document-header"><a href="https://prospeccaobrasil.com.br" aria-label="Prospecção Brasil"><img class="logo" src="/images/logo-wide.png" alt="Prospecção Brasil - Retail & Real Estate"></a><div class="reference"><span>Apresentação comercial</span><strong>${esc(i.codigo)}</strong></div></header>`;
  const footer = `<footer class="document-footer"><div><strong>Prospecção Brasil</strong><span>Retail & Real Estate · CJ 8762 / RJ</span></div><div><span>Atualizado em ${esc(updated)}</span><span>${esc(i.codigo)} · prospeccaobrasil.com.br</span></div></footer>`;
  const title = i.titulo || address(i);
  const hasDetails = Boolean(i.descricao?.trim() || docs.length || photos.length > 1);
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(i.codigo)} - Apresentação comercial</title><style>${styles}</style></head><body class="${completa ? 'complete' : 'compact'}">
<nav class="toolbar" aria-label="Ações da apresentação"><div><strong>Apresentação do imóvel</strong><span>Documento A4 · pronto para compartilhar</span></div><a href="?formato=${completa ? 'resumo' : 'completa'}">${completa ? 'Resumo · 1 folha' : 'Complementos · até 2 folhas'}</a><button type="button" onclick="window.print()">Imprimir / Salvar PDF</button></nav>
<main><article class="sheet" aria-label="Ficha comercial">${header}
<section class="intro"><div class="eyebrow">${esc(categories[i.categoria] || 'Imóvel comercial')} <span>/</span> ${deal} <span class="status">${esc(statuses[i.status] || 'Status sob consulta')}</span></div><h1 class="digital-only">${esc(title)}</h1><h1 class="print-only">${esc(title.slice(0,160))}${title.length > 160 ? '…' : ''}</h1>${i.titulo ? `<p class="street">${esc(address(i))}</p>` : ''}<p class="location">${esc(subtitle)}</p></section>
<div class="hero-row${mapa ? ' has-map' : ''}"><figure class="hero">${photos[0] ? `<img src="${esc(uploadUrl(photos[0].arquivo))}" alt="${esc(photos[0].legenda || `Foto do imóvel ${i.codigo}`)}" loading="eager">` : '<div class="no-photo"><span>PROSPECÇÃO BRASIL</span><strong>Fotografia não cadastrada</strong><p>Solicite imagens à nossa equipe comercial.</p></div>'}<figcaption>${photos[0] ? '01 / Imagem cadastrada do imóvel' : 'Imagens sob consulta'}<span>${esc(i.codigo)}</span></figcaption></figure>${mapa ? mapFigure(i, mapa) : ''}</div>
<section class="highlights" aria-label="Informações principais"><div><span class="small-label">${sale ? 'Valor de venda' : 'Custo mensal de ocupação'}</span><strong>${money(sale ? i.precoVenda : cost)}</strong><small>${sale ? 'Condições de negociação sob consulta' : completeCost ? 'Aluguel + condomínio + IPTU/cota*' : 'Há valores pendentes de confirmação'}</small></div><div><span class="small-label">Área bruta locável (ABL)</span><strong>${measure(i.areaTotal)}</strong><small>Área útil: ${measure(i.areaUtil)}</small></div></section>
<div class="facts-grid"><section><h2><span>01</span> Condições comerciais</h2><dl class="facts">${rows.map(([label,value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${i.periodoContrato ? `<p class="contract">Prazo de contrato: ${esc(i.periodoContrato)}</p>` : ''}<p class="fine-print">${sale ? 'Encargos apresentados conforme cadastro.' : '* Composição conforme valores cadastrados. Confirmar a periodicidade da cota de IPTU.'} CDU não integra o total mensal. Valores ausentes permanecem sob consulta.</p></section><section><h2><span>02</span> Características do imóvel</h2><dl class="facts dimensions">${dimensions.map(([label,value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section></div>
<section class="contact"><div><span class="small-label">Conheça o imóvel</span><h2>Agende uma visita.</h2><p>Luiz Claudio P. · <a href="https://wa.me/5521998423232">(21) 9 9842-3232</a></p><a class="email" href="mailto:comercial@prospeccaobrasil.com.br">comercial@prospeccaobrasil.com.br</a><p class="fine-print">Visitas mediante agendamento prévio.</p></div><a class="qr" href="${esc(locationUrl(i))}" target="_blank" rel="noopener noreferrer"><img src="${esc(qrData)}" alt="QR code para abrir a localização do imóvel"><span>Ver localização ↗</span></a></section>
<p class="disclaimer">Disponibilidade e condições sujeitas a confirmação. Esta apresentação não substitui a documentação técnica do imóvel.</p>
${footer}</article>
${hasDetails ? `<article class="sheet details" aria-label="Informações complementares">${header}<div class="section-intro"><span class="eyebrow">Informações complementares</span><h2 class="digital-only">${esc(title)}</h2><h2 class="print-only">${esc(title.slice(0,160))}${title.length > 160 ? '…' : ''}</h2><p>${esc(subtitle)}</p></div>
${i.descricao?.trim() ? `<section class="description"><h3>Sobre o imóvel</h3><p class="digital-only">${esc(i.descricao)}</p><p class="print-only">${esc(i.descricao.slice(0, 600))}${i.descricao.length > 600 ? '… Descrição completa na versão digital.' : ''}</p></section>` : ''}
${photos.length > 1 ? `<section class="gallery-section"><h3>Galeria do imóvel</h3><div class="gallery">${photos.slice(1).map((photo,index) => `<figure class="${index > 1 ? 'digital-only' : ''}"><img src="${esc(uploadUrl(photo.arquivo))}" alt="${esc(photo.legenda || `Foto ${index + 2} do imóvel`)}" loading="eager"><figcaption><span>${String(index + 2).padStart(2,'0')}</span> <span class="digital-only">${esc(photo.legenda || 'Imagem cadastrada do imóvel')}</span><span class="print-only">${esc((photo.legenda || 'Imagem cadastrada do imóvel').slice(0,100))}</span></figcaption></figure>`).join('')}</div></section>` : ''}
${docs.length ? `<section class="documents"><h3>Documentos para consulta</h3><p class="fine-print">Links disponíveis na versão digital. Somente anexos públicos são apresentados.</p><ul>${docs.map(d => `<li class="${docs.indexOf(d) > 3 ? 'digital-only' : ''}"><a href="${esc(d.href)}" target="_blank" rel="noopener noreferrer"><span><strong class="digital-only">${esc(d.nome || labels[d.tipo])}</strong><strong class="print-only">${esc((d.nome || labels[d.tipo]).slice(0,100))}</strong><small>${esc(labels[d.tipo])}</small></span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>` : ''}
<p class="print-only fine-print">Seleção de imagens e documentos. Consulte a versão digital para ver todos os complementos.</p>${footer}</article>` : ''}
</main><p class="print-help">Para gerar o PDF, clique em “Imprimir / Salvar PDF” e escolha “Salvar como PDF”. Use papel A4 e desative os cabeçalhos e rodapés do navegador.</p>
</body></html>`;
}
// Página pública só com as fotos do imóvel, para compartilhar no lugar de uma pasta externa.
function renderGaleria(i) {
  const photos = (i.fotos || []).filter(f => f.arquivo);
  const title = i.titulo || address(i);
  const place = [i.bairro, [i.cidade, i.uf].filter(Boolean).join(' / ')].filter(Boolean).join(' · ');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(i.codigo)} - Fotos</title><style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#f6f4ee;color:#153c34}
header{padding:28px 20px 8px;max-width:1180px;margin:0 auto}header span{font-size:11px;letter-spacing:1.6px;font-weight:700;color:#a27d42}
h1{margin:6px 0 4px;font-size:24px}header p{margin:0;color:#60726a;font-size:13px}header a{color:#153c34;font-size:13px}
main{max-width:1180px;margin:0 auto;padding:16px 20px 40px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
figure{margin:0;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e1d6}figure a{display:block}
img{display:block;width:100%;height:230px;object-fit:cover}figcaption{padding:9px 12px;font-size:12px;color:#60726a}
.empty{grid-column:1/-1;text-align:center;color:#60726a;padding:60px 0}footer{text-align:center;font-size:11px;color:#8d9a92;padding:0 0 28px}
</style></head><body>
<header><span>PROSPECÇÃO BRASIL · ${esc(i.codigo)}</span><h1>${esc(title)}</h1><p>${esc(place)} · ${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'} · <a href="/apresentacao/${i.id}">Ver apresentação do imóvel</a></p></header>
<main>${photos.length ? photos.map((f, n) => `<figure><a href="${esc(uploadUrl(f.arquivo))}" target="_blank" rel="noopener"><img src="${esc(uploadUrl(f.arquivo))}" alt="${esc(f.legenda || `Foto ${n + 1} do imóvel ${i.codigo}`)}" loading="${n < 6 ? 'eager' : 'lazy'}"></a>${f.legenda ? `<figcaption>${esc(f.legenda)}</figcaption>` : ''}</figure>`).join('') : '<p class="empty">Este imóvel ainda não tem fotos publicadas.</p>'}</main>
<footer>Prospecção Brasil · Retail &amp; Real Estate · prospeccaobrasil.com.br</footer></body></html>`;
}

module.exports = { renderApresentacao, renderGaleria, locationUrl };
