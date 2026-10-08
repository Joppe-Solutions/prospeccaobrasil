// Documento de inteligência de mercado — modelo geomarketing (Endurance-style),
// folhas A4 em paisagem, dados demográficos reais do IBGE quando disponíveis.
const styles = require('./inteligencia.styles');
const { FONTE: CENSO_FONTE } = require('../services/censo2022');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const present = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const num = (v) => present(v) ? Number(v).toLocaleString('pt-BR') : '—';
const money0 = (v) => present(v) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';
const address = (i) => [i.endereco, i.numero].filter(Boolean).join(', ') + (i.complemento ? ` - ${i.complemento}` : '');
const TIPOS = { locacao: 'Locação', venda: 'Venda direta', passagem_ponto: 'Passagem de ponto' };
const CATEGORIAS = { loja: 'Loja', predio: 'Prédio', terreno: 'Terreno', outro: 'Imóvel comercial' };
const STATUS = { disponivel: 'Disponível', negociacao: 'Em negociação', locado: 'Locado', vendido: 'Vendido' };
const CLASSES = [['A1', 'Acima de 20 sm', 'Acima de 26.040,00', '27.132,05'], ['A2', 'de 15 a 20 sm', '26.040,00', '20.942,44'], ['B1', 'de 10 a 15 sm', '19.530,00', '14.297,27'], ['B2', 'de 6 a 10 sm', '13.020,00', '9.100,92'], ['C1', 'de 4 a 6 sm', '7.812,00', '6.004,19'], ['C2', 'de 2 a 4 sm', '5.208,00', '3.048,74'], ['D', 'de 1 a 2 sm', '2.604,00', '1.524,61'], ['E', 'Até 1 sm', '1.302,00', '595,06']];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
// Faixas do documento → índices das faixas do Censo 2022 (services/censo2022.js)
const FAIXAS = [['0–14', [0, 1, 2]], ['15–29', [3, 4, 5]], ['30–39', [6]], ['40–49', [7]], ['50–59', [8]], ['60–69', [9]], ['70+', [10]]];
const SM_2022 = 1212;
const dec = (v, casas = 1) => present(v) ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) : '—';
const perc = (parte, total) => present(parte) && total ? `${dec((parte / total) * 100)}%` : '—';

function topStrip(i, date) {
  const local = [i.bairro, i.cidade, i.uf].filter(Boolean).join(' | ') || 'Local a confirmar';
  return `<div class="page-top"><span>INTELIGÊNCIA DE MERCADO&nbsp;&nbsp;|&nbsp;&nbsp;Brasil, ${esc(i.codigo)}&nbsp;|&nbsp;${esc(local)}</span><span>${esc(date)}</span></div>`;
}
function foot(i, src = 'Prospecção Brasil · Retail & Real Estate') {
  return `<div class="page-foot"><span>${esc(src)}</span><span>${esc(i.codigo)} · prospeccaobrasil.com.br</span></div>`;
}
const sheet = (content, cls = '') => `<article class="sheet ${cls}"><div class="geo-brand">G E O M A R K E T I N G</div><div class="sheet-inner">${content}</div></article>`;

// Mapa real: tiles OSM + anéis 500 m/1 km em SVG; fallback esquemático se sem geo
function mapVisual(imovel, demo) {
  const m = demo?.mapa;
  if (m) {
    const tiles = m.tiles.map((t) =>
      `<img src="https://tile.openstreetmap.org/${m.z}/${t.x}/${t.y}.png" alt="" width="256" height="256" style="position:absolute;left:${t.left}px;top:${t.top}px" crossorigin="anonymous">`).join('');
    return `<div class="map-real" style="width:${m.w}px;height:${m.h}px" role="img" aria-label="Mapa da área de influência">
      ${tiles}
      <svg width="${m.w}" height="${m.h}" style="position:absolute;left:0;top:0">
        <circle cx="${m.px}" cy="${m.py}" r="${m.r1}" fill="rgba(21,60,52,0.08)" stroke="#a27a35" stroke-width="2" stroke-dasharray="8 5"/>
        <circle cx="${m.px}" cy="${m.py}" r="${m.r1 / 2}" fill="rgba(21,60,52,0.12)" stroke="#a27a35" stroke-width="2"/>
        <circle cx="${m.px}" cy="${m.py}" r="8" fill="#153c34" stroke="#fff" stroke-width="2"/>
        <text x="${Math.min(m.px + 14, m.w - 60)}" y="${m.py - m.r1 / 2 - 8}" font-size="13" font-weight="700" fill="#153c34" paint-order="stroke" stroke="#fff" stroke-width="3">500 m</text>
        <text x="${Math.min(m.px + 14, m.w - 60)}" y="${m.py - m.r1 - 8}" font-size="13" font-weight="700" fill="#153c34" paint-order="stroke" stroke="#fff" stroke-width="3">1 km</text>
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
  <text x="196" y="95" font-size="10" fill="#67756f">500 m</text>
  <text x="196" y="28" font-size="10" fill="#67756f">1 km</text>
  <text x="180" y="288" font-size="8" fill="#67756f" text-anchor="middle">Mapa esquemático — endereço não geocodificado</text>
  </svg>`;
}

function popRow(label, obj, anos, cls = '') {
  const cells = anos.map((a) => `<td>${obj?.serie?.[a] ? num(obj.serie[a]) : '—'}</td>`).join('');
  return `<tr class="${cls}"><td>${esc(label)}</td><td>${obj?.tgca != null ? (obj.tgca * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>${cells}<td>${obj?.anoBase || '—'}</td></tr>`;
}
const L = (arr) => (arr || []).map((p) => `<li>${esc(p)}</li>`).join('');

function renderInteligencia(imovel, analise, demo) {
  const ai = analise?.conteudoJson ? JSON.parse(analise.conteudoJson) : {};
  const d = new Date(analise?.criadoEm || Date.now());
  const dataDoc = `${MESES[d.getUTCMonth()]} | ${d.getUTCFullYear()}`;
  const local = [imovel.bairro, imovel.cidade, imovel.uf].filter(Boolean).join(' | ');
  const score = analise?.score ?? ai.score ?? '—';
  const pct = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Number(score))) : 0;
  const anos = demo?.municipio?.anos || demo?.uf?.anos || [];
  const munNome = demo?.municipio?.nome || imovel.cidade || 'Município';
  const foto = imovel.fotos?.[0];
  const censo = demo?.censo;
  const ent = demo?.entorno;
  // Colunas das tabelas do Censo: bairro (quando identificado) e município
  const areas = [censo?.bairro && [`Bairro ${censo.bairro.nome}`, censo.bairro], censo?.municipio && [censo.municipio.nome, censo.municipio]].filter(Boolean);
  const semBairro = censo && !censo.bairro
    ? `<p class="note"><strong>Bairro não identificado.</strong> ${imovel.bairro ? `"${esc(imovel.bairro)}" não consta` : 'O cadastro não informa o bairro e por isso ele não consta'} ${censo.temBairros ? 'na base de bairros do Censo 2022 deste município — confira a grafia no cadastro do imóvel.' : 'neste recorte: o IBGE não divulga dados por bairro para este município.'} As tabelas trazem apenas o município.</p>` : '';
  const tabela = (linhas, primeira = 'Indicador') => areas.length ? `<table class="demo"><thead><tr><th>${primeira}</th>${areas.map(([n]) => `<th>${esc(n)}</th>`).join('')}</tr></thead>
  <tbody>${linhas.map(([rotulo, fn, cls = '']) => `<tr class="${cls}"><td>${rotulo}</td>${areas.map(([, a]) => `<td>${fn(a)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '<p class="note">Dados do Censo 2022 indisponíveis: município do cadastro não identificado na base do IBGE.</p>';
  const faixa = (a, idx) => idx.reduce((n, i) => n + (a.faixas[i] || 0), 0);
  const massa = (a) => (present(a.rendaMedia) && present(a.responsaveis) ? a.rendaMedia * a.responsaveis : null);
  const indice = (a) => (censo?.municipio?.rendaMedia && present(a.rendaMedia) ? Math.round((a.rendaMedia / censo.municipio.rendaMedia) * 100) : null);
  const b = censo?.bairro;
  const m = censo?.municipio;
  // Leitura em texto: só afirma o que os números das tabelas sustentam
  const leitura = [];
  if (b && m) {
    if (indice(b)) leitura.push(`A renda média do responsável pelo domicílio no bairro equivale a ${indice(b)}% da média do município (${money0(b.rendaMedia)} contra ${money0(m.rendaMedia)}).`);
    leitura.push(`Moradores de 30 a 59 anos são ${perc(faixa(b, [6, 7, 8]), b.populacao)} da população do bairro (${perc(faixa(m, [6, 7, 8]), m.populacao)} no município); 60 anos ou mais, ${perc(faixa(b, [9, 10]), b.populacao)} (${perc(faixa(m, [9, 10]), m.populacao)} no município).`);
    if (present(b.domiciliosVagos) && b.domicilios) leitura.push(`${perc(b.domiciliosVagos, b.domicilios)} dos domicílios do bairro estavam vagos no Censo (${perc(m.domiciliosVagos, m.domicilios)} no município).`);
    if (present(b.densidade)) leitura.push(`Densidade de ${num(Math.round(b.densidade))} hab/km² no bairro, contra ${num(Math.round(m.densidade))} hab/km² no município.`);
  }
  if (ent) leitura.push(`Há ${num(ent.total500)} estabelecimentos mapeados a até 500 m do ponto e ${num(ent.total1000)} a até 1 km.`);

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
        <div class="eyebrow">Geomarketing · bairro e rua</div>
        <h1>Inteligência<br>de mercado</h1>
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
        <li>A projeção da população do município e do estado usa a TGCA — Taxa Geométrica de Crescimento Anual — sobre as estimativas oficiais do IBGE.</li>
        <li><strong>Bairro:</strong> população, domicílios, faixa etária e rendimento vêm do Censo Demográfico 2022 (IBGE), no recorte do bairro do imóvel, sempre comparado ao município.</li>
        <li><strong>Rua:</strong> o entorno imediato (estabelecimentos, transporte e a própria via) vem do OpenStreetMap, nos raios de 500 m e 1 km a partir do ponto.</li>
        <li>O rendimento é o da pessoa responsável pelo domicílio (média e mediana), o indicador de renda que o Censo 2022 divulga por bairro.</li>
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
  <h2 class="sec"><span>LOCALIZAÇÃO</span>O ponto e os raios de 500 m e 1 km</h2>
  <div class="map-box">
    ${mapVisual(imovel, demo)}
    <div class="map-info">
      <h3>${esc(imovel.titulo || address(imovel))}</h3>
      <p>${esc([address(imovel), imovel.bairro, [imovel.cidade, imovel.uf].filter(Boolean).join(' / ')].filter(Boolean).join(' · '))}</p>
      <dl class="facts">
        <div><dt>Tipo / categoria</dt><dd>${esc(TIPOS[imovel.tipo] || imovel.tipo)} · ${esc(CATEGORIAS[imovel.categoria] || '—')}</dd></div>
        <div><dt>Status</dt><dd>${esc(STATUS[imovel.status] || imovel.status)}</dd></div>
        <div><dt>ABL</dt><dd>${present(imovel.areaTotal) ? `${Number(imovel.areaTotal).toLocaleString('pt-BR')} m²` : '—'}</dd></div>
        <div><dt>Coordenadas</dt><dd>${demo?.geo ? `${demo.geo.lat.toFixed(5)}, ${demo.geo.lon.toFixed(5)}` : 'Não geocodificadas'}</dd></div>
      </dl>
      ${imovel.googleMapsUrl ? `<p style="margin-top:10px"><a href="${esc(imovel.googleMapsUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline">Abrir localização no Google Maps ↗</a></p>` : ''}
    </div>
  </div>
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>BAIRRO E MUNICÍPIO</span>População e domicílios — Censo 2022</h2>
  ${tabela([
    ['População residente', (a) => num(a.populacao), 'hl'],
    ['Homens', (a) => `${num(a.homens)} <small>(${perc(a.homens, a.homens + a.mulheres)})</small>`],
    ['Mulheres', (a) => `${num(a.mulheres)} <small>(${perc(a.mulheres, a.homens + a.mulheres)})</small>`],
    ['Área (km²)', (a) => dec(a.areaKm2, 2)],
    ['Densidade (hab/km²)', (a) => num(Math.round(a.densidade))],
    ['Domicílios', (a) => num(a.domicilios), 'hl'],
    ['Domicílios ocupados', (a) => `${num(a.domiciliosOcupados)} <small>(${perc(a.domiciliosOcupados, a.domicilios)})</small>`],
    ['Domicílios vagos', (a) => `${num(a.domiciliosVagos)} <small>(${perc(a.domiciliosVagos, a.domicilios)})</small>`],
    ['Domicílios de uso ocasional', (a) => `${num(a.usoOcasional)} <small>(${perc(a.usoOcasional, a.domicilios)})</small>`],
    ['Moradores por domicílio ocupado', (a) => dec(a.moradoresPorDomicilio)],
  ])}
  <p class="src">Fonte: ${esc(CENSO_FONTE)}.</p>
  ${semBairro}
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>MUNICÍPIO E ESTADO</span>Evolução populacional — habitantes ${anos.length ? `${anos[0]} / ${anos[1]} / ${anos[2]}` : ''}</h2>
  ${anos.length ? `<table class="demo"><thead><tr><th>Território</th><th>TGCA % a.a.</th>${anos.map((a) => `<th>${a}</th>`).join('')}<th>Base</th></tr></thead>
  <tbody>
    ${popRow(munNome, demo?.municipio, anos, 'hl')}
    ${popRow(demo?.uf?.nome || 'UF', demo?.uf, anos, '')}
  </tbody></table>
  <p class="src">Fonte: estimativas oficiais de população do IBGE; os anos seguintes ao ano-base são projeção por TGCA. O IBGE não publica estimativa anual por bairro: para o bairro vale o Censo 2022 da página anterior.</p>`
    : '<p class="note">Série de estimativas do IBGE indisponível no momento da geração. Abra o documento novamente para incluí-la.</p>'}
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>BAIRRO E MUNICÍPIO</span>Habitantes por faixa etária — Censo 2022</h2>
  ${areas.length ? `<table class="demo"><thead><tr><th>Território</th>${FAIXAS.map(([r]) => `<th>${r}</th>`).join('')}<th>Total</th></tr></thead>
  <tbody>${areas.map(([nome, a]) => `<tr class="hl"><td>${esc(nome)}</td>${FAIXAS.map(([, idx]) => `<td>${num(faixa(a, idx))}</td>`).join('')}<td>${num(a.populacao)}</td></tr>
    <tr class="dim"><td>% do total</td>${FAIXAS.map(([, idx]) => `<td>${perc(faixa(a, idx), a.populacao)}</td>`).join('')}<td>100%</td></tr>`).join('')}</tbody></table>
  <p class="src">Fonte: ${esc(CENSO_FONTE)}. Faixas agregadas a partir dos grupos de idade divulgados.</p>` : tabela([])}
  ${semBairro}
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>BAIRRO E MUNICÍPIO</span>Renda — Censo 2022</h2>
  ${tabela([
    ['Rendimento médio mensal do responsável', (a) => money0(a.rendaMedia), 'hl'],
    ['Rendimento mediano mensal do responsável', (a) => money0(a.rendaMediana)],
    ['Rendimento médio em salários mínimos de 2022', (a) => (present(a.rendaMedia) ? `${dec(a.rendaMedia / SM_2022)} sm` : '—')],
    ['Índice de renda (município = 100)', (a) => (indice(a) ?? '—')],
    ['Responsáveis por domicílio', (a) => num(a.responsaveis)],
    ['Massa de renda mensal estimada', (a) => money0(massa(a)), 'hl'],
  ])}
  <p class="src">Fonte: ${esc(CENSO_FONTE)}. Valores nominais de 2022 (salário mínimo de R$ 1.212). Massa de renda = rendimento médio × responsáveis por domicílio; é uma estimativa de ordem de grandeza, pois a média considera apenas responsáveis com rendimento.</p>
  ${semBairro}
  ${foot(imovel)}`)}
${sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>RUA E ENTORNO</span>O que existe ao redor do ponto</h2>
  ${ent ? `<div class="two-col">
    <section>
      <table class="demo compact"><thead><tr><th>Estabelecimentos mapeados</th><th>Até 500 m</th><th>Até 1 km</th></tr></thead>
      <tbody>${ent.linhas.map((l) => `<tr><td>${esc(l.rotulo)}</td><td>${num(l.r500)}</td><td>${num(l.r1000)}</td></tr>`).join('')}
      <tr class="hl"><td>Total</td><td>${num(ent.total500)}</td><td>${num(ent.total1000)}</td></tr></tbody></table>
    </section>
    <section>
      <table class="demo compact"><thead><tr><th>Transporte</th><th>Até 500 m</th><th>Até 1 km</th></tr></thead>
      <tbody>${ent.transporte.map((l) => `<tr><td>${esc(l.rotulo)}</td><td>${num(l.r500)}</td><td>${num(l.r1000)}</td></tr>`).join('')}</tbody></table>
      ${ent.via ? `<table class="demo compact" style="margin-top:10px"><thead><tr><th colspan="2">A via — ${esc(ent.via.nome)}</th></tr></thead>
      <tbody><tr><td>Tipo</td><td>${esc(ent.via.tipo)}</td></tr>${ent.via.faixas ? `<tr><td>Faixas</td><td>${esc(ent.via.faixas)}</td></tr>` : ''}${ent.via.maoUnica ? `<tr><td>Sentido</td><td>${esc(ent.via.maoUnica)}</td></tr>` : ''}${ent.via.velocidade ? `<tr><td>Velocidade máxima</td><td>${esc(ent.via.velocidade)}</td></tr>` : ''}</tbody></table>` : ''}
      ${ent.destaques.length ? `<table class="demo compact" style="margin-top:10px"><thead><tr><th>Mais próximo</th><th>Nome</th><th>Distância</th></tr></thead>
      <tbody>${ent.destaques.map((d) => `<tr><td>${esc(d.rotulo)}</td><td>${esc(d.nome)}</td><td>${num(d.dist)} m</td></tr>`).join('')}</tbody></table>` : ''}
    </section>
  </div>
  ${ent.naRua.length ? `<p style="font-size:10px;margin-top:10px;line-height:1.5"><strong>Na mesma rua ou vizinhos imediatos:</strong> ${ent.naRua.map((n) => esc(n.nome)).join(' · ')}.</p>` : ''}
  <p class="src">Fonte: OpenStreetMap (Overpass API), consulta de ${new Date(ent.consultadoEm || Date.now()).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}; distâncias em linha reta a partir do ponto do mapa. Mapeamento colaborativo: as contagens indicam o mínimo existente e não substituem levantamento de campo.</p>`
    : `<p class="note"><strong>Entorno indisponível.</strong> ${demo?.geo ? 'O serviço de mapas não respondeu no momento da geração. Abra o documento novamente em alguns minutos.' : 'O endereço não pôde ser localizado no mapa — confira logradouro, bairro e cidade no cadastro do imóvel.'}</p>`}
  ${foot(imovel)}`)}
${leitura.length ? sheet(`${topStrip(imovel, dataDoc)}
  <h2 class="sec"><span>SÍNTESE</span>Leitura dos dados</h2>
  <ul class="findings fortes" style="font-size:12.5px;line-height:1.9">${L(leitura)}</ul>
  <p class="src">Síntese gerada a partir das tabelas anteriores (Censo 2022 e OpenStreetMap). Não inclui fluxo de pedestres, concorrência qualificada nem potencial de consumo por categoria, que dependem de levantamento de campo.</p>
  ${foot(imovel)}`) : ''}
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
      <li>Séries populacionais (município e estado): estimativas oficiais IBGE com projeção por TGCA.</li>
      <li>População, domicílios, faixa etária e rendimento: Censo Demográfico 2022 (IBGE), nos recortes de bairro e município.</li>
      <li>Entorno da rua: OpenStreetMap. A cobertura varia por região; ausência de um estabelecimento no mapa não prova que ele não existe.</li>
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
