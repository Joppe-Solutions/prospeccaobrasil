// Documento de inteligência de mercado — modelo geomarketing (Endurance-style),
// folhas A4 em paisagem, dados demográficos reais do IBGE quando disponíveis.
const styles = require('./inteligencia.styles');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const present = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const num = (v) => present(v) ? Number(v).toLocaleString('pt-BR') : '—';
const money = (v) => present(v) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }) : '—';
const measure = (v, u = 'm²') => present(v) ? `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${u}` : '—';
const address = (i) => [i.endereco, i.numero].filter(Boolean).join(', ') + (i.complemento ? ` - ${i.complemento}` : '');
const TIPOS = { locacao: 'Locação', venda: 'Venda' };
const CATEGORIAS = { loja: 'Loja', predio: 'Prédio', terreno: 'Terreno', outro: 'Imóvel comercial' };
const STATUS = { disponivel: 'Disponível', negociacao: 'Em negociação', locado: 'Locado', vendido: 'Vendido' };
const CLASSES = [['A1', 'Acima de 20 sm', 'Acima de 26.040,00', '27.132,05'], ['A2', 'de 15 a 20 sm', '26.040,00', '20.942,44'], ['B1', 'de 10 a 15 sm', '19.530,00', '14.297,27'], ['B2', 'de 6 a 10 sm', '13.020,00', '9.100,92'], ['C1', 'de 4 a 6 sm', '7.812,00', '6.004,19'], ['C2', 'de 2 a 4 sm', '5.208,00', '3.048,74'], ['D', 'de 1 a 2 sm', '2.604,00', '1.524,61'], ['E', 'Até 1 sm', '1.302,00', '595,06']];

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function topStrip(i, date, extra = '') {
  const local = [i.bairro, i.cidade, i.uf].filter(Boolean).join(' | ') || 'Local a confirmar';
  return `<div class="page-top"><span>CONTAGEM DEMOGRÁFICA&nbsp;&nbsp;|&nbsp;&nbsp;Brasil, ${esc(i.codigo)}&nbsp;|&nbsp;${esc(local)}${extra}</span><span>${esc(date)}</span></div>`;
}
function foot(i, src = 'Prospecção Brasil · Retail & Real Estate') {
  return `<div class="page-foot"><span>${esc(src)}</span><span>${esc(i.codigo)} · prospeccaobrasil.com.br</span></div>`;
}
const sheet = (content, cls = '') => `<article class="sheet ${cls}"><div class="geo-brand">G E O M A R K E T I N G</div><div class="sheet-inner">${content}</div></article>`;

// Mapa esquemático: círculos concêntricos 1km/2km (SVG vetorial — imprime nítido)
function mapVisual(i) {
  const hasCoords = present(i.latitude) && present(i.longitude);
  return `<svg class="map-visual" width="360" height="300" viewBox="0 0 360 300" role="img" aria-label="Área de influência esquemática">
  <rect x="0" y="0" width="360" height="300" fill="#f4f6f1" rx="6"/>
  <circle cx="180" cy="150" r="140" fill="none" stroke="#a27a35" stroke-width="1.6" stroke-dasharray="5 4"/>
  <circle cx="180" cy="150" r="70" fill="#153c3410" stroke="#a27a35" stroke-width="1.6"/>
  <circle cx="180" cy="150" r="7" fill="#153c34"/>
  <text x="196" y="146" font-size="11" font-weight="700" fill="#153c34">${esc(i.codigo)}</text>
  <text x="196" y="95" font-size="10" fill="#67756f">1 km</text>
  <text x="196" y="28" font-size="10" fill="#67756f">2 km</text>
  <line x1="180" y1="150" x2="250" y2="150" stroke="#67756f" stroke-width="0.7"/>
  <line x1="180" y1="150" x2="320" y2="150" stroke="#67756f" stroke-width="0.7" stroke-dasharray="3 3"/>
  <text x="180" y="288" font-size="8" fill="#67756f" text-anchor="middle">Mapa esquemático de raios — ${hasCoords ? `centrado em ${esc(Number(i.latitude).toFixed(5))}, ${esc(Number(i.longitude).toFixed(5))}` : 'coordenadas não cadastradas'}</text>
  </svg>`;
}

function popRow(label, obj, anos, cls = '') {
  const cells = anos.map((a) => `<td>${obj?.serie?.[a] ? num(obj.serie[a]) : '—'}</td>`).join('');
  return `<tr class="${cls}"><td>${esc(label)}</td><td>${obj?.tgca != null ? (obj.tgca * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>${cells}</tr>`;
}

const L = (arr) => (arr || []).map((p) => `<li>${esc(p)}</li>`).join('');

function renderInteligencia(imovel, analise, demo) {
  const ai = analise?.conteudoJson ? JSON.parse(analise.conteudoJson) : {};
  const ind = ai.indicadores || {};
  const d = new Date(analise?.criadoEm || Date.now());
  const dataDoc = `${MESES[d.getUTCMonth()]} | ${d.getUTCFullYear()}`;
  const local = [imovel.bairro, imovel.cidade, imovel.uf].filter(Boolean).join(' | ');
  const score = analise?.score ?? ai.score ?? '—';
  const pct = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Number(score))) : 0;
  const anos = demo?.municipio?.anos || demo?.uf?.anos || [];
  const lev = '<tr class="dim"><td>%s</td>' + '<td>—</td>'.repeat(3 + anos.length) + '</tr>';
  const notaLev = `<p class="note"><strong>Sob levantamento geomarketing:</strong> dados por raio de influência (1 km / 2 km) exigem pesquisa de campo e recorte censitário (setores IBGE). As linhas do município e da UF usam dados oficiais; as linhas de raio ficam reservadas ao levantamento.</p>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(imovel.codigo)} - Inteligência de mercado</title><style>${styles}</style></head><body>
<nav class="toolbar"><div><strong>Inteligência de mercado</strong><span>Documento geomarketing · A4 paisagem · ${esc(imovel.codigo)}</span></div><button type="button" onclick="window.print()">Imprimir / Salvar PDF</button></nav>
<main>
${sheet(`
  <div class="cover" style="display:flex;flex-direction:column;height:100%;justify-content:space-between">
    <img class="cover-logo" src="/images/logo-wide.png" alt="Prospecção Brasil">
    <div class="cover-mid">
      <div class="eyebrow">Geomarketing</div>
      <h1>Contagem<br>demográfica</h1>
      <div class="cover-rule"></div>
      <div class="cover-place">${esc(local)}</div>
      <p class="muted" style="margin-top:10px">${esc(imovel.titulo || address(imovel))}</p>
    </div>
    <div class="cover-bottom"><span>PROSPECÇÃO BRASIL · RETAIL &amp; REAL ESTATE</span><span>${esc(dataDoc)} · ${esc(imovel.codigo)}</span></div>
  </div>`, 'cover')}
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
        <li>As séries demográficas usam as estimativas oficiais do Instituto Brasileiro de Geografia e Estatística — IBGE.</li>
        <li>A renda domiciliar adotada em estudos de campo segue cruzamentos entre rendimento domiciliar e rendimento das famílias (POF/IBGE), obedecendo à divisão de classes do Critério Brasil.</li>
        <li>Dados por raio de influência (1 km / 2 km) são marcados como "sob levantamento" até que o recorte censitário e o trabalho de campo sejam executados.</li>
      </ul>
      ${demo ? `<p class="src">Fonte demográfica: ${esc(demo.fonte)}.</p>` : `<p class="src">Série demográfica indisponível no momento da geração — município não localizado ou IBGE fora do ar.</p>`}
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
    ${mapVisual(imovel)}
    <div class="map-info">
      <h3>${esc(imovel.titulo || address(imovel))}</h3>
      <p>${esc([address(imovel), imovel.bairro, [imovel.cidade, imovel.uf].filter(Boolean).join(' / ')].filter(Boolean).join(' · '))}</p>
      <dl class="facts">
        <div><dt>Tipo / categoria</dt><dd>${esc(TIPOS[imovel.tipo] || imovel.tipo)} · ${esc(CATEGORIAS[imovel.categoria] || '—')}</dd></div>
        <div><dt>Status</dt><dd>${esc(STATUS[imovel.status] || imovel.status)}</dd></div>
        <div><dt>Área total</dt><dd>${measure(imovel.areaTotal)}</dd></div>
        <div><dt>Coordenadas</dt><dd>${present(imovel.latitude) ? `${Number(imovel.latitude).toFixed(5)}, ${Number(imovel.longitude).toFixed(5)}` : 'Não cadastradas'}</dd></div>
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
    ${lev.replace('%s', '1 KM')}
    ${lev.replace('%s', '2 KM')}
    ${lev.replace('%s', 'Total raios')}
    ${popRow(demo?.municipio?.nome || `${imovel.cidade || 'Município'}`, demo?.municipio, anos, 'hl')}
    ${popRow(demo?.uf?.nome || 'UF', demo?.uf, anos, '')}
  </tbody></table>
  <p class="src">Fonte: ${esc(demo?.fonte || 'IBGE')}. Linhas de raio sob levantamento geomarketing.</p>
  ${notaLev}
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>ÁREA DE INFLUÊNCIA</span>Domicílios por classe social ${anos[0] || ''}</h2>
  <table class="demo"><thead><tr><th>Área de influência</th><th>A1</th><th>A2</th><th>B1</th><th>B2</th><th>C1</th><th>C2</th><th>D/E</th><th>Total</th></tr></thead>
  <tbody>
    ${'<tr class="dim"><td>1 KM</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>'}
    ${'<tr class="dim"><td>2 KM</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>'}
    ${'<tr class="dim"><td>Município</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>'}
  </tbody></table>
  <p class="src">Fonte de referência: Censo Demográfico — IBGE / Critério Brasil.</p>
  ${notaLev}
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>ÁREA DE INFLUÊNCIA</span>Habitantes por faixa etária ${anos[0] || ''}</h2>
  <table class="demo"><thead><tr><th>Área de influência</th><th>0–9</th><th>10–19</th><th>20–29</th><th>30–39</th><th>40–49</th><th>50–59</th><th>60–69</th><th>70+</th><th>Total</th></tr></thead>
  <tbody>
    ${'<tr class="dim"><td>1 KM</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>'}
    ${'<tr class="dim"><td>2 KM</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>'}
    ${'<tr class="dim"><td>Município</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>'}
  </tbody></table>
  <h2 class="sec" style="margin-top:26px"><span>ÁREA DE INFLUÊNCIA</span>RMDM e potencial de consumo</h2>
  <table class="demo"><thead><tr><th>Área de influência</th><th>RMDM R$</th><th>Renda total ${anos[0] || ''}</th><th>%</th><th>Projeção +2</th><th>Projeção +4</th></tr></thead>
  <tbody>
    ${'<tr class="dim"><td>1 KM</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>'}
    ${'<tr class="dim"><td>2 KM</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>'}
  </tbody></table>
  <p class="src">Renda média domiciliar mensal e potencial por categoria exigem recorte censitário e POF/IBGE.</p>
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
      <li>Séries populacionais: dados oficiais IBGE com projeção por TGCA.</li>
      <li>Recortes por raio (1 km / 2 km), classes sociais, faixas etárias, renda e consumo são marcados "sob levantamento" até o trabalho de campo e o recorte por setores censitários.</li>
      <li>A triagem cadastral é heurística: deriva exclusivamente dos dados do imóvel e não substitui estudo de mercado.</li>
    </ul></div>
    <div><ul style="padding-left:18px;font-size:11px;line-height:1.8">
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
