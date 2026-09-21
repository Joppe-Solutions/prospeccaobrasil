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

function renderApresentacao(i, qrData) {
  const sale = i.tipo === 'venda';
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
  ];
  const dimensions = [['Área total', measure(i.areaTotal)], ['Área útil', measure(i.areaUtil)],
    ['Piso / área de venda', measure(i.pisoAreaVenda)], ['Jirau', measure(i.jirau)],
    ['Mezanino', measure(i.mezanino)], ['Frente', measure(i.frenteImovel, 'm')], ['Pé-direito', measure(i.peDireito, 'm')]];
  const header = `<header class="document-header"><a href="https://prospeccaobrasil.com.br" aria-label="Prospecção Brasil"><img class="logo" src="/images/logo-wide.png" alt="Prospecção Brasil - Retail & Real Estate"></a><div class="reference"><span>Apresentação comercial</span><strong>${esc(i.codigo)}</strong></div></header>`;
  const footer = `<footer class="document-footer"><div><strong>Prospecção Brasil</strong><span>Retail & Real Estate · CJ 8762 / RJ</span></div><div><span>Atualizado em ${esc(updated)}</span><span>${esc(i.codigo)} · prospeccaobrasil.com.br</span></div></footer>`;
  const title = i.titulo || address(i);
  const hasDetails = Boolean(i.descricao?.trim() || docs.length || photos.length > 1);
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(i.codigo)} - Apresentação comercial</title><style>${styles}</style></head><body>
<nav class="toolbar" aria-label="Ações da apresentação"><div><strong>Apresentação do imóvel</strong><span>Documento A4 · pronto para compartilhar</span></div><button type="button" onclick="window.print()">Imprimir / Salvar PDF</button></nav>
<main><article class="sheet" aria-label="Ficha comercial">${header}
<section class="intro"><div class="eyebrow">${esc(categories[i.categoria] || 'Imóvel comercial')} <span>/</span> ${sale ? 'Venda' : 'Locação'} <span class="status">${esc(statuses[i.status] || 'Status sob consulta')}</span></div><h1>${esc(title)}</h1>${i.titulo ? `<p class="street">${esc(address(i))}</p>` : ''}<p class="location">${esc(subtitle)}</p></section>
<figure class="hero">${photos[0] ? `<img src="${esc(uploadUrl(photos[0].arquivo))}" alt="${esc(photos[0].legenda || `Foto do imóvel ${i.codigo}`)}" loading="eager">` : '<div class="no-photo"><span>PROSPECÇÃO BRASIL</span><strong>Fotografia não cadastrada</strong><p>Solicite imagens à nossa equipe comercial.</p></div>'}<figcaption>${photos[0] ? '01 / Imagem cadastrada do imóvel' : 'Imagens sob consulta'}<span>${esc(i.codigo)}</span></figcaption></figure>
<section class="highlights" aria-label="Informações principais"><div><span class="small-label">${sale ? 'Valor de venda' : 'Custo mensal de ocupação'}</span><strong>${money(sale ? i.precoVenda : cost)}</strong><small>${sale ? 'Condições de negociação sob consulta' : completeCost ? 'Aluguel + condomínio + IPTU/cota*' : 'Há valores pendentes de confirmação'}</small></div><div><span class="small-label">Área total cadastrada</span><strong>${measure(i.areaTotal)}</strong><small>Área útil: ${measure(i.areaUtil)}</small></div></section>
<div class="facts-grid"><section><h2><span>01</span> Condições comerciais</h2><dl class="facts">${rows.map(([label,value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${i.periodoContrato ? `<p class="contract">Prazo de contrato: ${esc(i.periodoContrato)}</p>` : ''}<p class="fine-print">${sale ? 'Encargos apresentados conforme cadastro.' : '* Composição conforme valores cadastrados. Confirmar a periodicidade da cota de IPTU.'} CDU não integra o total mensal. Valores ausentes permanecem sob consulta.</p></section><section><h2><span>02</span> Características do imóvel</h2><dl class="facts dimensions">${dimensions.map(([label,value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section></div>
<section class="contact"><div><span class="small-label">Conheça o imóvel</span><h2>Agende uma visita.</h2><p>Luiz Claudio P. · <a href="https://wa.me/5521998423232">(21) 9 9842-3232</a></p><a class="email" href="mailto:comercial@prospeccaobrasil.com.br">comercial@prospeccaobrasil.com.br</a><p class="fine-print">Visitas mediante agendamento prévio.</p></div><a class="qr" href="${esc(locationUrl(i))}" target="_blank" rel="noopener noreferrer"><img src="${esc(qrData)}" alt="QR code para abrir a localização do imóvel"><span>Ver localização ↗</span></a></section>
<p class="disclaimer">Disponibilidade e condições sujeitas a confirmação. Esta apresentação não substitui a documentação técnica do imóvel.</p>
${footer}</article>
${hasDetails ? `<article class="sheet details" aria-label="Informações complementares">${header}<div class="section-intro"><span class="eyebrow">Informações complementares</span><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>
${i.descricao?.trim() ? `<section class="description"><h3>Sobre o imóvel</h3><p>${esc(i.descricao)}</p></section>` : ''}
${photos.length > 1 ? `<section class="gallery-section"><h3>Galeria do imóvel</h3><div class="gallery">${photos.slice(1).map((photo,index) => `<figure><img src="${esc(uploadUrl(photo.arquivo))}" alt="${esc(photo.legenda || `Foto ${index + 2} do imóvel`)}" loading="eager"><figcaption><span>${String(index + 2).padStart(2,'0')}</span> ${esc(photo.legenda || 'Imagem cadastrada do imóvel')}</figcaption></figure>`).join('')}</div></section>` : ''}
${docs.length ? `<section class="documents"><h3>Documentos para consulta</h3><p class="fine-print">Links disponíveis na versão digital. Somente anexos públicos são apresentados.</p><ul>${docs.map(d => `<li><a href="${esc(d.href)}" target="_blank" rel="noopener noreferrer"><span><strong>${esc(d.nome || labels[d.tipo])}</strong><small>${esc(labels[d.tipo])}</small></span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>` : ''}
${footer}</article>` : ''}
</main><p class="print-help">Para gerar o PDF, clique em “Imprimir / Salvar PDF” e escolha “Salvar como PDF”. Use papel A4 e desative os cabeçalhos e rodapés do navegador.</p>
</body></html>`;
}
module.exports = { renderApresentacao, locationUrl };
