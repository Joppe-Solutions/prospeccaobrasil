// Documento de inteligência de mercado — modelo geomarketing (Endurance-style),
// folhas A4 em paisagem, dados demográficos reais do IBGE quando disponíveis.
const styles = require('./inteligencia.styles');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const present = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const num = (v) => present(v) ? Number(v).toLocaleString('pt-BR') : '—';
const money0 = (v) => present(v) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';
const address = (i) => [i.endereco, i.numero].filter(Boolean).join(', ') + (i.complemento ? ` - ${i.complemento}` : '');
const TIPOS = { locacao: 'Locação', venda: 'Venda' };
const CATEGORIAS = { loja: 'Loja', predio: 'Prédio', terreno: 'Terreno', outro: 'Imóvel comercial' };
const STATUS = { disponivel: 'Disponível', negociacao: 'Em negociação', locado: 'Locado', vendido: 'Vendido' };
const CLASSES = [['A1', 'Acima de 20 sm', 'Acima de 26.040,00', '27.132,05'], ['A2', 'de 15 a 20 sm', '26.040,00', '20.942,44'], ['B1', 'de 10 a 15 sm', '19.530,00', '14.297,27'], ['B2', 'de 6 a 10 sm', '13.020,00', '9.100,92'], ['C1', 'de 4 a 6 sm', '7.812,00', '6.004,19'], ['C2', 'de 2 a 4 sm', '5.208,00', '3.048,74'], ['D', 'de 1 a 2 sm', '2.604,00', '1.524,61'], ['E', 'Até 1 sm', '1.302,00', '595,06']];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
// Faixas do modelo Endurance → soma dos grupos quinquenais do Censo
const FAIXAS = [['0–9', ['0 a 4 anos', '5 a 9 anos']], ['10–19', ['10 a 14 anos', '15 a 19 anos']], ['20–29', ['20 a 24 anos', '25 a 29 anos']], ['30–39', ['30 a 34 anos', '35 a 39 anos']], ['40–49', ['40 a 44 anos', '45 a 49 anos']], ['50–59', ['50 a 54 anos', '55 a 59 anos']], ['60–69', ['60 a 64 anos', '65 a 69 anos']], ['70+', ['70 a 74 anos', '75 a 79 anos', '80 a 84 anos', '85 a 89 anos', '90 a 94 anos', '95 a 99 anos']]];

function topStrip(i, date) {
  const local = [i.bairro, i.cidade, i.uf].filter(Boolean).join(' | ') || 'Local a confirmar';
  return `<div class="page-top"><span>CONTAGEM DEMOGRÁFICA&nbsp;&nbsp;|&nbsp;&nbsp;Brasil, ${esc(i.codigo)}&nbsp;|&nbsp;${esc(local)}</span><span>${esc(date)}</span></div>`;
}
function foot(i, src = 'Prospecção Brasil · Retail & Real Estate') {
  return `<div class="page-foot"><span>${esc(src)}</span><span>${esc(i.codigo)} · prospeccaobrasil.com.br</span></div>`;
}
const sheet = (content, cls = '') => `<article class="sheet ${cls}"><div class="geo-brand">G E O M A R K E T I N G</div><div class="sheet-inner">${content}</div></article>`;

// Mapa real: tiles OSM + anéis 1km/2km em SVG; fallback esquemático se sem geo
function mapVisual(imovel, demo) {
  const m = demo?.mapa;
  if (m) {
    const tiles = m.tiles.map((t) =>
      `<img src="https://tile.openstreetmap.org/${m.z}/${t.x}/${t.y}.png" alt="" width="256" height="256" style="position:absolute;left:${t.left}px;top:${t.top}px" crossorigin="anonymous">`).join('');
    return `<div class="map-real" style="width:${m.w}px;height:${m.h}px" role="img" aria-label="Mapa da área de influência">
      ${tiles}
      <svg width="${m.w}" height="${m.h}" style="position:absolute;left:0;top:0">
        <circle cx="${m.px}" cy="${m.py}" r="${m.r2}" fill="rgba(21,60,52,0.08)" stroke="#a27a35" stroke-width="2" stroke-dasharray="8 5"/>
        <circle cx="${m.px}" cy="${m.py}" r="${m.r1}" fill="rgba(21,60,52,0.12)" stroke="#a27a35" stroke-width="2"/>
        <circle cx="${m.px}" cy="${m.py}" r="8" fill="#153c34" stroke="#fff" stroke-width="2"/>
        <text x="${Math.min(m.px + 14, m.w - 60)}" y="${m.py - m.r1 - 8}" font-size="13" font-weight="700" fill="#153c34" paint-order="stroke" stroke="#fff" stroke-width="3">1 km</text>
        <text x="${Math.min(m.px + 14, m.w - 60)}" y="${m.py - m.r2 - 8}" font-size="13" font-weight="700" fill="#153c34" paint-order="stroke" stroke="#fff" stroke-width="3">2 km</text>
        <text x="${Math.min(m.px + 16, m.w - 80)}" y="${m.py + 5}" font-size="13" font-weight="700" fill="#153c34" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(imovel.codigo)}</text>
      </svg>
      <span class="map-attr">© OpenStreetMap contributors${demo.geo?.fonte ? ` · centro: ${esc(demo.geo.fonte)}` : ''}</span>
    </div>`;
  }
  return `<svg class="map-visual" width="360" height="300" viewBox="0 0 360 300" role="img" aria-label="Área de influência esquemática">
  <rect x="0" y="0" width="360" height="300" fill="#f4f6f1" rx="6"/>
  <circle cx="180" cy="150" r="140" fill="none" stroke="#a27a35" stroke-width="1.6" stroke-dasharray="5 4"/>
  <circle cx="180" cy="150" r="70" fill="#153c3410" stroke="#a27a35" stroke-width="1.6"/>
  <circle cx="180" cy="150" r="7" fill="#153c34"/>
  <text x="196" y="146" font-size="11" font-weight="700" fill="#153c34">${esc(imovel.codigo)}</text>
  <text x="196" y="95" font-size="10" fill="#67756f">1 km</text>
  <text x="196" y="28" font-size="10" fill="#67756f">2 km</text>
  <text x="180" y="288" font-size="8" fill="#67756f" text-anchor="middle">Mapa esquemático — endereço não geocodificado</text>
  </svg>`;
}

function popRow(label, obj, anos, cls = '') {
  const cells = anos.map((a) => `<td>${obj?.serie?.[a] ? num(obj.serie[a]) : '—'}</td>`).join('');
  return `<tr class="${cls}"><td>${esc(label)}</td><td>${obj?.tgca != null ? (obj.tgca * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>${cells}<td>${obj?.anoBase || '—'}</td></tr>`;
}
const lev = (label, cols) => `<tr class="dim"><td>${esc(label)}</td>${'<td>—</td>'.repeat(cols)}</tr>`;
const L = (arr) => (arr || []).map((p) => `<li>${esc(p)}</li>`).join('');

function renderInteligencia(imovel, analise, demo) {
  const ai = analise?.conteudoJson ? JSON.parse(analise.conteudoJson) : {};
  const d = new Date(analise?.criadoEm || Date.now());
  const dataDoc = `${MESES[d.getUTCMonth()]} | ${d.getUTCFullYear()}`;
  const local = [imovel.bairro, imovel.cidade, imovel.uf].filter(Boolean).join(' | ');
  const score = analise?.score ?? ai.score ?? '—';
  const pct = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Number(score))) : 0;
  const anos = demo?.municipio?.anos || demo?.uf?.anos || [];
  const censo = demo?.censo2010;
  const munNome = demo?.municipio?.nome || imovel.cidade || 'Município';
  const foto = imovel.fotos?.[0];
  const notaLev = `<p class="note"><strong>Sob levantamento geomarketing:</strong> dados por raio de influência (1 km / 2 km) exigem pesquisa de campo e recorte por setores censitários. As linhas de município e UF usam dados oficiais IBGE; as linhas de raio ficam reservadas ao levantamento.</p>`;

  // Agrega faixas quinquenais do Censo nas faixas do modelo
  const faixaVals = FAIXAS.map(([rotulo, grupos]) => [rotulo, grupos.reduce((s, g) => s + (censo?.faixaEtaria?.[g] || 0), 0) || null]);
  const totalFaixas = faixaVals.reduce((s, [, v]) => s + (v || 0), 0);
  const rendaPerCap = censo?.rendaPerCapita;
  const popCenso = censo?.sexo ? (censo.sexo.homens || 0) + (censo.sexo.mulheres || 0) : null;
  const rendaTotal = rendaPerCap && popCenso ? rendaPerCap * popCenso : null;
  const domTotal = censo?.classesRendimento?.reduce((s, c) => s + (c.total || 0), 0);

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(imovel.codigo)} - Inteligência de mercado</title><style>${styles}</style></head><body>
<nav class="toolbar"><div><strong>Inteligência de mercado</strong><span>Documento geomarketing · A4 paisagem · ${esc(imovel.codigo)}</span></div><button type="button" onclick="window.print()">Imprimir / Salvar PDF</button></nav>
<main>
<article class="sheet cover">
  <div class="geo-brand">G E O M A R K E T I N G</div>
  <div class="cover-grid">
    <div class="cover-left">
      <img class="cover-logo" src="/images/logo-wide.png" alt="Prospecção Brasil">
      <div class="cover-mid">
        <div class="eyebrow">Geomarketing</div>
        <h1>Contagem<br>demográfica</h1>
        <div class="cover-rule"></div>
        <div class="cover-place">${esc(local)}</div>
        <p style="margin-top:10px;font-size:13px;color:var(--muted)">${esc(imovel.titulo || address(imovel))}</p>
      </div>
      <div class="cover-bottom"><span>PROSPECÇÃO BRASIL · RETAIL &amp; REAL ESTATE</span><span>${esc(dataDoc)} · ${esc(imovel.codigo)}</span></div>
    </div>
    <div class="cover-right"${foto ? ` style="background-image:linear-gradient(rgba(21,60,52,.25),rgba(21,60,52,.55)),url('${esc(foto.arquivo)}')"` : ''}>
      <div class="cover-right-inner">
        <span class="cover-code">${esc(imovel.codigo)}</span>
        <span class="cover-tag">${esc(imovel.cidade || '')}${imovel.uf ? ` · ${esc(imovel.uf)}` : ''}</span>
      </div>
    </div>
  </div>
</article>
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>METODOLOGIA</span>Metodologia e premissas</h2>
  <div class="body-cols">
    <div>
      <p><strong>Geographic Information Systems (GIS).</strong> Consiste no tratamento e mapeamento de informações mercadológicas em plataformas cartográficas digitalizadas da região em estudo, contemplando:</p>
      <ul>
        <li>Pesquisa e organização de dados secundários oficiais.</li>
        <li>Trabalhos de campo na região de influência direta do site.</li>
        <li>Cadastramento e mapeamento dos atributos geo-mercadológicos pertinentes.</li>
        <li>Análise das potencialidades e diagnóstico mercadológico.</li>
      </ul>
      <p>Utiliza-se a combinação de duas fontes de dados: dados obtidos junto a órgãos e entidades geradoras de informações oficiais e dados complementares obtidos em pesquisas pela internet.</p>
    </div>
    <div>
      <p><strong>Premissas deste documento.</strong></p>
      <ul>
        <li>A projeção da população para os anos seguintes está baseada na TGCA — Taxa Geométrica de Crescimento Anual.</li>
        <li>As séries demográficas usam estimativas oficiais do IBGE; os dados de universo (idade, sexo, rendimento) vêm do Censo Demográfico 2010.</li>
        <li>A renda domiciliar adotada em estudos de campo segue cruzamentos entre rendimento domiciliar e rendimento das famílias (POF/IBGE), obedecendo à divisão de classes do Critério Brasil.</li>
        <li>Dados por raio de influência (1 km / 2 km) são marcados "sob levantamento" até que o recorte censitário e o trabalho de campo sejam executados.</li>
      </ul>
      ${demo ? `<p class="src">Fonte demográfica: ${esc(demo.fonte)}.</p>` : `<p class="src">Série demográfica indisponível no momento da geração.</p>`}
    </div>
  </div>
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>METODOLOGIA</span>Critério de classificação social</h2>
  <p style="font-size:11px;color:var(--muted);margin-bottom:14px">Classes sociais divididas em 8 níveis, respeitando os limites de rendimento médio domiciliar.</p>
  <table class="crit"><thead><tr><th>Classificação</th><th>Salários mínimos</th><th>Limite de rendimento R$</th><th>Média POF - IBGE</th></tr></thead>
  <tbody>${CLASSES.map((c) => `<tr><td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td></tr>`).join('')}</tbody></table>
  <p class="src">Fonte: IBGE / Critério Brasil — POF referente ao estado da federação do imóvel.</p>
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>ÁREA DE INFLUÊNCIA</span>Dados demográficos</h2>
  <div class="map-box">
    ${mapVisual(imovel, demo)}
    <div class="map-info">
      <h3>${esc(imovel.titulo || address(imovel))}</h3>
      <p>${esc([address(imovel), imovel.bairro, [imovel.cidade, imovel.uf].filter(Boolean).join(' / ')].filter(Boolean).join(' · '))}</p>
      <dl class="facts">
        <div><dt>Tipo / categoria</dt><dd>${esc(TIPOS[imovel.tipo] || imovel.tipo)} · ${esc(CATEGORIAS[imovel.categoria] || '—')}</dd></div>
        <div><dt>Status</dt><dd>${esc(STATUS[imovel.status] || imovel.status)}</dd></div>
        <div><dt>Área total</dt><dd>${present(imovel.areaTotal) ? `${Number(imovel.areaTotal).toLocaleString('pt-BR')} m²` : '—'}</dd></div>
        <div><dt>Coordenadas</dt><dd>${demo?.geo ? `${demo.geo.lat.toFixed(5)}, ${demo.geo.lon.toFixed(5)}` : 'Não geocodificadas'}</dd></div>
      </dl>
      ${imovel.googleMapsUrl ? `<p style="margin-top:10px"><a href="${esc(imovel.googleMapsUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline">Abrir localização no Google Maps ↗</a></p>` : ''}
      ${notaLev}
    </div>
  </div>
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>ÁREA DE INFLUÊNCIA</span>Evolução populacional — habitantes ${anos.length ? `${anos[0]} / ${anos[1]} / ${anos[2]}` : ''}</h2>
  <table class="demo"><thead><tr><th>Área de influência</th><th>TGCA %</th>${anos.map((a) => `<th>${a}</th>`).join('')}<th>Base</th></tr></thead>
  <tbody>
    ${lev('1 KM', 2 + anos.length)}
    ${lev('2 KM', 2 + anos.length)}
    ${lev('Total raios', 2 + anos.length)}
    ${popRow(munNome, demo?.municipio, anos, 'hl')}
    ${popRow(demo?.uf?.nome || 'UF', demo?.uf, anos, '')}
  </tbody></table>
  <p class="src">Fonte: estimativas oficiais IBGE; projeções por TGCA sobre o último ano estimado.</p>
  ${censo?.sexo ? `<table class="demo" style="margin-top:16px"><thead><tr><th>Censo 2010 — ${esc(munNome)}</th><th>Homens</th><th>Mulheres</th><th>Total</th></tr></thead>
  <tbody><tr class="hl"><td>População residente</td><td>${num(censo.sexo.homens)}</td><td>${num(censo.sexo.mulheres)}</td><td>${num(popCenso)}</td></tr></tbody></table>
  <p class="src">Fonte: Censo Demográfico 2010 — IBGE.</p>` : ''}
  ${notaLev}
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>ÁREA DE INFLUÊNCIA</span>Domicílios por faixa de rendimento — Censo 2010</h2>
  <table class="demo"><thead><tr><th>Área de influência</th>${(censo?.classesRendimento || [[''], [''], [''], [''], [''], [''], [''], [''], ['']]).map((c) => `<th style="font-size:8.5px">${esc(c.faixa || '')}</th>`).join('')}<th>Total</th></tr></thead>
  <tbody>
    ${lev('1 KM', (censo?.classesRendimento?.length || 8) + 1)}
    ${lev('2 KM', (censo?.classesRendimento?.length || 8) + 1)}
    ${censo?.classesRendimento?.length ? `<tr class="hl"><td>${esc(munNome)}</td>${censo.classesRendimento.map((c) => `<td>${num(c.total)}</td>`).join('')}<td>${num(domTotal)}</td></tr>` : `<tr class="dim"><td>${esc(munNome)}</td>${'<td>—</td>'.repeat(9)}</tr>`}
  </tbody></table>
  <p class="src">Fonte: Censo Demográfico 2010 — IBGE (classes de rendimento nominal mensal domiciliar per capita).</p>
  ${notaLev}
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>ÁREA DE INFLUÊNCIA</span>Habitantes por faixa etária — Censo 2010</h2>
  <table class="demo"><thead><tr><th>Área de influência</th>${FAIXAS.map(([r]) => `<th>${r}</th>`).join('')}<th>Total</th></tr></thead>
  <tbody>
    ${lev('1 KM', FAIXAS.length + 1)}
    ${lev('2 KM', FAIXAS.length + 1)}
    <tr class="hl"><td>${esc(munNome)}</td>${faixaVals.map(([, v]) => `<td>${v ? num(v) : '—'}</td>`).join('')}<td>${totalFaixas ? num(totalFaixas) : '—'}</td></tr>
  </tbody></table>
  <p class="src">Fonte: Censo Demográfico 2010 — IBGE (grupos quinquenais agregados nas faixas do modelo).</p>
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>ÁREA DE INFLUÊNCIA</span>RMDM e potencial de consumo</h2>
  <table class="demo"><thead><tr><th>Área de influência</th><th>RMDM per capita R$ (2010)</th><th>População 2010</th><th>Renda total estimada R$/mês</th><th>Observação</th></tr></thead>
  <tbody>
    ${lev('1 KM', 4)}
    ${lev('2 KM', 4)}
    <tr class="hl"><td>${esc(munNome)}</td><td>${rendaPerCap ? money0(rendaPerCap) : '—'}</td><td>${num(popCenso)}</td><td>${rendaTotal ? money0(rendaTotal) : '—'}</td><td style="text-align:left">estimativa: renda per capita × população</td></tr>
  </tbody></table>
  <p class="src">Fonte: Censo Demográfico 2010 — IBGE (rendimento nominal médio mensal domiciliar per capita). O potencial de consumo por categoria exige levantamento de campo e POF.</p>
  ${notaLev}
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>DIAGNÓSTICO CADASTRAL</span>Triagem do ponto — ${esc(imovel.codigo)}</h2>
  <div class="score-line"><div class="score-ring" style="background:conic-gradient(var(--gold) ${pct}%, #e7ebe6 0)"><span>${esc(score)}</span></div>
  <div><strong style="font-size:14px">Score de triagem cadastral</strong><p class="muted" style="font-size:11px;margin-top:4px">${esc(analise?.resumo || '')}</p></div></div>
  <div class="two-col">
    <section><h2 class="sec" style="font-size:16px"><span>01</span>Pontos fortes</h2><ul class="findings fortes">${L(ai.pontosFortes)}</ul></section>
    <section><h2 class="sec" style="font-size:16px"><span>02</span>Pontos de atenção</h2><ul class="findings atencao">${L(ai.pontosAtencao)}</ul></section>
  </div>
  <h2 class="sec" style="font-size:16px;margin-top:22px"><span>03</span>Segmentos recomendados</h2>
  <div class="tags">${(ai.segmentosRecomendados || []).map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>
  ${ai.recomendacao ? `<div class="recommend"><strong>Recomendação:</strong> ${esc(ai.recomendacao)}</div>` : ''}
  ${ai.aviso ? `<p class="aviso"><strong>Importante:</strong> ${esc(ai.aviso)}</p>` : ''}
  ${foot(imovel, `Modelo: ${analise?.modelo || 'triagem-interna'} · Prospecção Brasil`)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>ENCERRAMENTO</span>Limitações e uso do documento</h2>
  <div class="body-cols">
    <div><ul style="padding-left:18px;font-size:11px;line-height:1.8">
      <li>Séries populacionais: estimativas oficiais IBGE com projeção por TGCA.</li>
      <li>Sexo, faixa etária, rendimento e domicílios por faixa: universo Censo Demográfico 2010 (IBGE), no recorte municipal.</li>
      <li>Recortes por raio (1 km / 2 km) e potencial de consumo por categoria ficam "sob levantamento" até o trabalho de campo e o recorte por setores censitários.</li>
      <li>A triagem cadastral é heurística: deriva exclusivamente dos dados do imóvel e não substitui estudo de mercado.</li>
    </ul></div>
    <div><ul style="padding-left:18px;font-size:11px;line-height:1.8">
      <li>Mapa: OpenStreetMap; centro obtido por geocodificação do endereço quando o cadastro não tem coordenadas.</li>
      <li>Quando habilitado, provedor externo de IA recebe somente atributos físicos/comerciais do ponto.</li>
      <li>Documento interno Prospecção Brasil — não apresentar a terceiros como estudo de mercado concluído.</li>
      <li>Disponibilidade e condições do imóvel sujeitas a confirmação.</li>
    </ul></div>
  </div>
  <div style="margin-top:auto;text-align:center;padding-top:30px">
    <img class="cover-logo" src="/images/logo-wide.png" alt="Prospecção Brasil" style="width:150px">
    <p class="muted" style="margin-top:14px;font-size:10px;letter-spacing:2px">CONEXÕES QUE EXPANDEM POSSIBILIDADES</p>
  </div>
  ${foot(imovel)}`)}
</main><p class="print-help">Documento em A4 paisagem — ao salvar em PDF, use orientação "Paisagem" e desative cabeçalhos/rodapés do navegador.</p>
</body></html>`;
}

module.exports = { renderInteligencia };
