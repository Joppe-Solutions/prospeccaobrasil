// Relatório de inteligência de mercado (geomarketing). Cada folha mede exatamente A4 paisagem (297 × 210 mm):
// o conteúdo é dimensionado para caber nela, folhas sem dados são omitidas e nunca sobra folha vazia ou
// conteúdo escorrendo para a seguinte. Os gráficos são SVG (templates/graficos.js).
const styles = require('./inteligencia.styles');
const G = require('./graficos');
const { FONTE: CENSO_FONTE } = require('../services/censo2022');
const { estimarClasses, SALARIO_MINIMO_2022 } = require('../services/classes');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const present = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const num = (v) => (present(v) ? Number(v).toLocaleString('pt-BR') : '—');
const money0 = (v) => (present(v) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—');
const dec = (v, casas = 1) => (present(v) ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) : '—');
const perc = (parte, total) => (present(parte) && total ? `${dec((parte / total) * 100)}%` : '—');
const trunc = (texto, n) => { const t = String(texto ?? ''); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };
const address = (i) => [i.endereco, i.numero].filter(Boolean).join(', ') + (i.complemento ? ` - ${i.complemento}` : '');
const TIPOS = { locacao: 'Locação', venda: 'Venda direta', passagem_ponto: 'Passagem de ponto' };
const CATEGORIAS = { loja: 'Loja', predio: 'Prédio', terreno: 'Terreno', outro: 'Imóvel comercial' };
const STATUS = { disponivel: 'Disponível', negociacao: 'Em negociação', locado: 'Locado', vendido: 'Vendido' };
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const SM = SALARIO_MINIMO_2022;

// Critério de classificação social: [classe, salários mínimos, limite superior em sm (null = sem teto), média POF/IBGE]
const CRITERIO = [
  ['A1', 'Acima de 20 sm', null, 27132.05], ['A2', 'de 15 a 20 sm', 20, 20942.44], ['B1', 'de 10 a 15 sm', 15, 14297.27], ['B2', 'de 6 a 10 sm', 10, 9100.92],
  ['C1', 'de 4 a 6 sm', 6, 6004.19], ['C2', 'de 2 a 4 sm', 4, 3048.74], ['D', 'de 1 a 2 sm', 2, 1524.61], ['E', 'Até 1 sm', 1, 595.06],
];
const fmt2 = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Faixas do relatório → índices das faixas do Censo 2022 (services/censo2022.js)
const FAIXAS = [['0–14', [0, 1, 2]], ['15–29', [3, 4, 5]], ['30–39', [6]], ['40–49', [7]], ['50–59', [8]], ['60–69', [9]], ['70+', [10]]];
const ROTULOS_PIRAMIDE = ['0–4', '5–9', '10–14', '15–19', '20–24', '25–29', '30–39', '40–49', '50–59', '60–69', '70+'];

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
  return `<svg class="map-visual" viewBox="0 0 360 300" role="img" aria-label="Área de influência esquemática">
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

const L = (arr, max = 6, tam = 150) => (arr || []).slice(0, max).map((p) => `<li>${esc(trunc(p, tam))}</li>`).join('');

function popRow(label, obj, anos, cls = '') {
  const cells = anos.map((a) => `<td>${obj?.serie?.[a] ? num(obj.serie[a]) : '—'}</td>`).join('');
  return `<tr class="${cls}"><td>${esc(label)}</td><td>${obj?.tgca != null ? dec(obj.tgca * 100, 2) : '—'}</td>${cells}</tr>`;
}

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
  const b = censo?.bairro;
  const m = censo?.municipio;
  // Colunas das tabelas do Censo: bairro (quando identificado) e município
  const areas = [b && [`Bairro ${b.nome}`, b, G.COR.verde], m && [m.nome, m, G.COR.dourado]].filter(Boolean);
  const semBairro = censo && !b
    ? `<p class="note"><strong>Bairro não identificado.</strong> ${imovel.bairro ? `"${esc(imovel.bairro)}" não consta` : 'O cadastro não informa o bairro e por isso ele não consta'} ${censo.temBairros ? 'na base de bairros do Censo 2022 deste município — confira a grafia no cadastro do imóvel.' : 'neste recorte: o IBGE não divulga dados por bairro para este município.'} As análises usam o município.</p>` : '';
  const tabela = (linhas, primeira = 'Indicador', cls = '') => `<table class="demo ${cls}"><thead><tr><th>${primeira}</th>${areas.map(([n]) => `<th>${esc(n)}</th>`).join('')}</tr></thead>
  <tbody>${linhas.map(([rotulo, fn, cls = '']) => `<tr class="${cls}"><td>${rotulo}</td>${areas.map(([, a]) => `<td>${fn(a)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const faixa = (a, idx) => idx.reduce((n, i) => n + (a.faixas[i] || 0), 0);
  const totalFaixas = (a) => a.faixas.reduce((n, v) => n + (v || 0), 0);
  const massa = (a) => (present(a.rendaMedia) && present(a.responsaveis) ? a.rendaMedia * a.responsaveis : null);
  const indice = (a) => (m?.rendaMedia && present(a.rendaMedia) ? Math.round((a.rendaMedia / m.rendaMedia) * 100) : null);
  const base = b || m; // território principal das análises
  const classes = areas.map(([nome, a, cor]) => ({ nome, cor, r: estimarClasses(a) })).filter((c) => c.r);

  // Leitura em texto: só afirma o que os números sustentam
  const leitura = [];
  if (b && m) {
    if (indice(b)) leitura.push(`A renda média do responsável pelo domicílio no bairro equivale a ${indice(b)}% da média do município (${money0(b.rendaMedia)} contra ${money0(m.rendaMedia)}).`);
    leitura.push(`Moradores de 30 a 59 anos são ${perc(faixa(b, [6, 7, 8]), totalFaixas(b))} da população do bairro (${perc(faixa(m, [6, 7, 8]), totalFaixas(m))} no município); 60 anos ou mais, ${perc(faixa(b, [9, 10]), totalFaixas(b))} (${perc(faixa(m, [9, 10]), totalFaixas(m))} no município).`);
    if (present(b.domiciliosVagos) && b.domicilios) leitura.push(`${perc(b.domiciliosVagos, b.domicilios)} dos domicílios do bairro estavam vagos no Censo (${perc(m.domiciliosVagos, m.domicilios)} no município).`);
    if (present(b.densidade)) leitura.push(`Densidade de ${num(Math.round(b.densidade))} hab/km² no bairro, contra ${num(Math.round(m.densidade))} hab/km² no município.`);
  }
  const cb = classes.find((c) => c.nome.startsWith('Bairro'))?.r;
  if (cb) { const ab = cb.classes.filter((c) => ['A1', 'A2', 'B1', 'B2'].includes(c.id)).reduce((n, c) => n + c.pct, 0); leitura.push(`Estimativa: ${dec(ab)}% dos domicílios do bairro estão nas classes A e B e ${dec(cb.classes.find((c) => c.id === 'D/E').pct)}% na classe D/E.`); }
  if (ent) leitura.push(`Há ${num(ent.total500)} estabelecimentos mapeados a até 500 m do ponto e ${num(ent.total1000)} a até 1 km.`);

  // ---------------------------------------------------------------- folhas (cada uma só existe se tiver conteúdo)
  const folhas = [];
  const sumario = []; // { n, titulo } de cada folha, para o sumário da metodologia
  const folha = (secao, titulo, corpo, nota = '') => { sumario.push({ n: folhas.length + 2, titulo: titulo.replace(/<[^>]+>/g, '') }); folhas.push((n, total) => `<article class="sheet"><div class="geo-brand">G E O M A R K E T I N G</div><div class="sheet-inner">
  <div class="page-top"><span>INTELIGÊNCIA DE MERCADO&nbsp;&nbsp;|&nbsp;&nbsp;Brasil, ${esc(imovel.codigo)}&nbsp;|&nbsp;${esc(local || 'Local a confirmar')}</span><span>${esc(dataDoc)}</span></div>
  <h2 class="sec"><span>${secao}</span>${titulo}</h2>
  <div class="page-body">${typeof corpo === 'function' ? corpo(n, total) : corpo}</div>
  <div class="page-foot"><span>${esc(nota || 'Prospecção Brasil · Retail & Real Estate')}</span><span>${esc(imovel.codigo)} · ${n} / ${total}</span></div>
</div></article>`); };
  const fonteCenso = `Fonte: ${esc(CENSO_FONTE)}.`;

  // Metodologia
  folha('METODOLOGIA', 'Metodologia e premissas', () => `
    <div class="cols2">
      <div class="col texto">
        <p><strong>Geographic Information Systems (GIS).</strong> Consiste no tratamento e mapeamento de informações mercadológicas em plataformas cartográficas digitalizadas da região em estudo, contemplando:</p>
        <ul><li>Pesquisa e organização de dados secundários oficiais.</li><li>Trabalhos de campo na região de influência direta do site.</li><li>Cadastramento e mapeamento dos atributos geo-mercadológicos pertinentes.</li><li>Análise das potencialidades e diagnóstico mercadológico.</li></ul>
        <p>Utiliza-se a combinação de duas fontes de dados: dados obtidos junto a órgãos e entidades geradoras de informações oficiais e dados complementares obtidos em pesquisas pela internet.</p>
      </div>
      <div class="col texto">
        <p><strong>Premissas deste documento.</strong></p>
        <ul>
          <li>A projeção da população do município e do estado usa a TGCA — Taxa Geométrica de Crescimento Anual — sobre as estimativas oficiais do IBGE.</li>
          <li><strong>Bairro:</strong> população, domicílios, faixa etária e rendimento vêm do Censo Demográfico 2022 (IBGE), no recorte do bairro do imóvel, sempre comparado ao município.</li>
          <li><strong>Rua:</strong> o entorno imediato (estabelecimentos, transporte e a própria via) vem do OpenStreetMap, nos raios de 500 m e 1 km a partir do ponto.</li>
          <li>O rendimento é o da pessoa responsável pelo domicílio (média e mediana), o indicador de renda que o Censo 2022 divulga por bairro.</li>
          <li>Os domicílios por classe social são <strong>estimados</strong> a partir desse rendimento (ver a página própria).</li>
        </ul>
      </div>
    </div>
    <div class="sumario"><h3>Neste documento</h3><ol>${sumario.filter((x) => x.n !== 2).map((x) => `<li><span>${String(x.n).padStart(2, '0')}</span>${esc(x.titulo)}</li>`).join('')}</ol></div>
    <div class="cartoes">
      <div><span>BAIRRO</span><strong>Censo Demográfico 2022</strong><small>IBGE · agregados por bairros e municípios</small></div>
      <div><span>RUA E ENTORNO</span><strong>OpenStreetMap</strong><small>Estabelecimentos, transporte e via em 500 m e 1 km</small></div>
      <div><span>MUNICÍPIO E ESTADO</span><strong>Estimativas de população</strong><small>IBGE · projeção por TGCA</small></div>
    </div>`);

  // Critério de classificação social (tabela + gráfico, como no modelo de referência)
  folha('METODOLOGIA', 'Critério de classificação social', `
    <p class="intro">Classes sociais divididas em 8 níveis, respeitando os limites de rendimento médio domiciliar (salário mínimo de referência: ${money0(SM)}).</p>
    <div class="cols2 fill">
      <div class="col">
        <table class="demo crit"><thead><tr><th>Classificação</th><th>Salários mínimos</th><th>Limite de rendimento R$</th><th>Média POF – IBGE</th></tr></thead>
        <tbody>${CRITERIO.map(([c, sms, teto, pof]) => `<tr><td><strong>${c}</strong></td><td>${sms}</td><td>${teto === null ? `Acima de ${fmt2(20 * SM)}` : fmt2(teto * SM)}</td><td>${fmt2(pof)}</td></tr>`).join('')}</tbody></table>
        <p class="src">Fonte: IBGE / Critério Brasil — POF referente ao estado da federação do imóvel; limites calculados sobre o salário mínimo de ${money0(SM)} (referência do Censo 2022).</p>
        <div class="exemplo"><strong>Como ler</strong><p>A classe é definida pela renda mensal do domicílio em salários mínimos. Exemplo: com renda de ${money0(8000)} (${dec(8000 / SM)} sm), o domicílio está na classe <b>B2</b> (de 6 a 10 sm). Nas páginas seguintes, os domicílios do bairro e do município são distribuídos nessas classes.</p></div>
      </div>
      <div class="col chart-box"><h3>Média POF – IBGE (R$/mês)</h3><div class="chart">${G.barras({ itens: CRITERIO.map(([c, , , pof]) => ({ rotulo: c, valor: pof })), largura: 464, altura: 540, descricao: 'Média POF por classe social', formato: (v) => G.pt(v) })}</div></div>
    </div>`);

  // Localização
  folha('LOCALIZAÇÃO', 'O ponto e os raios de 500 m e 1 km', `
    <div class="map-box">
      <div class="map-slot">${mapVisual(imovel, demo)}</div>
      <div class="map-info">
        <h3>${esc(trunc(imovel.titulo || address(imovel), 70))}</h3>
        <p>${esc([address(imovel), imovel.bairro, [imovel.cidade, imovel.uf].filter(Boolean).join(' / ')].filter(Boolean).join(' · '))}</p>
        <dl class="facts">
          <div><dt>Tipo / categoria</dt><dd>${esc(TIPOS[imovel.tipo] || imovel.tipo)} · ${esc(CATEGORIAS[imovel.categoria] || '—')}</dd></div>
          <div><dt>Status</dt><dd>${esc(STATUS[imovel.status] || imovel.status)}</dd></div>
          <div><dt>ABL</dt><dd>${present(imovel.areaTotal) ? `${Number(imovel.areaTotal).toLocaleString('pt-BR')} m²` : '—'}</dd></div>
          <div><dt>Coordenadas</dt><dd>${demo?.geo ? `${demo.geo.lat.toFixed(5)}, ${demo.geo.lon.toFixed(5)}` : 'Não geocodificadas'}</dd></div>
          ${demo?.geo?.precisao === 'rua' ? '<div><dt>Precisão</dt><dd>Aproximada (rua)</dd></div>' : ''}
          ${present(imovel.areaUtil) ? `<div><dt>Área útil</dt><dd>${Number(imovel.areaUtil).toLocaleString('pt-BR')} m²</dd></div>` : ''}
          ${present(imovel.frenteImovel) ? `<div><dt>Frente</dt><dd>${Number(imovel.frenteImovel).toLocaleString('pt-BR')} m</dd></div>` : ''}
          ${present(imovel.peDireito) ? `<div><dt>Pé-direito</dt><dd>${Number(imovel.peDireito).toLocaleString('pt-BR')} m</dd></div>` : ''}
          ${present(imovel.aluguel) ? `<div><dt>Aluguel</dt><dd>${money0(imovel.aluguel)}</dd></div>` : ''}
          ${present(imovel.condominio) ? `<div><dt>Condomínio</dt><dd>${money0(imovel.condominio)}</dd></div>` : ''}
          ${present(imovel.iptu) ? `<div><dt>IPTU</dt><dd>${money0(imovel.iptu)}</dd></div>` : ''}
          ${present(imovel.cdu) ? `<div><dt>CDU</dt><dd>${money0(imovel.cdu)}</dd></div>` : ''}
        </dl>
        ${demo?.entorno ? `<table class="demo compact no-raio"><thead><tr><th>No entorno do ponto</th><th>500 m</th><th>1 km</th></tr></thead><tbody>
          <tr class="hl"><td>Estabelecimentos mapeados</td><td>${num(demo.entorno.total500)}</td><td>${num(demo.entorno.total1000)}</td></tr>
          ${demo.entorno.linhas.filter((l) => l.r1000 > 0).sort((a, c) => c.r1000 - a.r1000).slice(0, 4).map((l) => `<tr><td>${esc(l.rotulo.replace(/ \(.*\)/, ''))}</td><td>${num(l.r500)}</td><td>${num(l.r1000)}</td></tr>`).join('')}
          ${demo.entorno.transporte.filter((l) => l.r1000 > 0).slice(0, 2).map((l) => `<tr><td>${esc(l.rotulo)}</td><td>${num(l.r500)}</td><td>${num(l.r1000)}</td></tr>`).join('')}
        </tbody></table>` : ''}
        <div class="raios"><span><i></i>Raio de 500 m</span><span><i class="tracejado"></i>Raio de 1 km</span><span><b></b>${esc(imovel.codigo)}</span></div>
        ${imovel.googleMapsUrl ? `<p class="link"><a href="${esc(imovel.googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir localização no Google Maps ↗</a></p>` : ''}
      </div>
    </div>`, 'Mapa: OpenStreetMap contributors · raios em linha reta a partir do ponto');

  // População e domicílios
  if (areas.length) {
    folha('BAIRRO E MUNICÍPIO', 'População e domicílios — Censo 2022', `
      <div class="cols2 fill">
        <div class="col">${tabela([
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
        ], 'Indicador', 'solto')}${semBairro}</div>
        <div class="col charts">
          <div class="chart-box"><h3>Distribuição por sexo — ${esc(areas[0][0])}</h3><div class="chart">${G.rosca({ fatias: [{ rotulo: 'Homens', valor: areas[0][1].homens, cor: G.COR.verde }, { rotulo: 'Mulheres', valor: areas[0][1].mulheres, cor: G.COR.dourado }], centro: { valor: G.compacto(areas[0][1].populacao), titulo: 'habitantes' }, largura: 464, altura: 276, descricao: 'Distribuição por sexo' })}</div></div>
          <div class="chart-box"><h3>Situação dos domicílios</h3><div class="chart">${G.barraEmpilhada({ linhas: areas.map(([n, a]) => ({ rotulo: n.replace('Bairro ', ''), partes: [{ rotulo: 'Ocupados', valor: a.domiciliosOcupados, cor: G.COR.verde }, { rotulo: 'Vagos', valor: a.domiciliosVagos, cor: G.COR.dourado }, { rotulo: 'Uso ocasional', valor: a.usoOcasional, cor: G.COR.areia }] })), largura: 464, altura: 276, descricao: 'Situação dos domicílios' })}</div></div>
        </div>
      </div>`, fonteCenso.replace(/<[^>]+>/g, ''));
  }

  // Domicílios por classe social (estimativa)
  if (classes.length) {
    const ids = classes[0].r.classes.map((c) => c.id);
    folha('BAIRRO E MUNICÍPIO', 'Domicílios por classe social', `
      <table class="demo classes"><thead><tr><th>Área de influência</th>${ids.map((id) => `<th>${id}</th>`).join('')}<th>Total</th></tr></thead>
      <tbody>${classes.map(({ nome, r }) => `<tr class="hl"><td>${esc(nome)}</td>${r.classes.map((c) => `<td>${num(c.qtd)}</td>`).join('')}<td>${num(r.total)}</td></tr><tr class="dim"><td>%</td>${r.classes.map((c) => `<td>${dec(c.pct)}%</td>`).join('')}<td>100%</td></tr>`).join('')}</tbody></table>
      <div class="chart-box grow"><h3>Participação de cada classe nos domicílios (%)</h3><div class="chart">${G.barrasAgrupadas({ categorias: ids, series: classes.map((c) => ({ nome: c.nome, cor: c.cor, valores: c.r.classes.map((x) => Number(x.pct.toFixed(1))) })), formato: (v) => `${G.pt(v, 1)}%`, largura: 976, altura: 392, descricao: 'Domicílios por classe social' })}</div></div>
      <p class="note compacta"><strong>Estimativa.</strong> O IBGE não divulga domicílios por classe social em nível de bairro. A distribuição foi calculada ajustando uma curva lognormal à média e à mediana do rendimento do responsável pelo domicílio (Censo 2022) e aplicando os limites do Critério Brasil sobre o salário mínimo de ${money0(SM)}. Como considera só o rendimento do responsável, tende a subestimar a renda total do domicílio. Use como ordem de grandeza.</p>`,
    'Fonte: IBGE, Censo Demográfico 2022 (rendimento do responsável) · Critério Brasil · estimativa Prospecção Brasil');
  }

  // Evolução populacional + faixa etária (unificadas)
  const temEvolucao = anos.length > 0;
  const temFaixas = base?.faixas && totalFaixas(base) > 0;
  if (temEvolucao || temFaixas) {
    const serie = demo?.municipio?.serie || {};
    const baseAno = demo?.municipio?.anoBase;
    const anosGrafico = Object.keys(serie).map(Number).sort((x, y) => x - y);
    const esquerda = temEvolucao ? `
      <div class="chart-box"><h3>Evolução populacional — ${esc(munNome)}</h3><div class="chart">${G.linha({ itens: anosGrafico.map((a) => ({ rotulo: String(a), valor: serie[a], projecao: Boolean(baseAno && a > baseAno) })), largura: 464, altura: 480, descricao: 'Evolução populacional do município' })}</div>
        <p class="legenda-mini"><i style="background:${G.COR.verde}"></i>Estimativa IBGE <i style="background:${G.COR.dourado}"></i>Projeção por TGCA · eixo ajustado à faixa dos dados</p></div>
      <table class="demo compact"><thead><tr><th>Território</th><th>TGCA % a.a.</th>${anos.map((a) => `<th>${a}</th>`).join('')}</tr></thead>
      <tbody>${popRow(munNome, demo?.municipio, anos, 'hl')}${popRow(demo?.uf?.nome || 'UF', demo?.uf, anos, '')}</tbody></table>` : '';
    const direita = temFaixas ? `
      <div class="chart-box"><h3>Pirâmide etária — ${esc(areas[0][0])}</h3><div class="chart">${base.homensFaixas && base.mulheresFaixas ? G.piramide({ rotulos: ROTULOS_PIRAMIDE, esquerda: base.homensFaixas, direita: base.mulheresFaixas, largura: 464, altura: 520, descricao: 'Pirâmide etária' }) : ''}</div></div>
      <table class="demo compact"><thead><tr><th>Faixa etária</th>${FAIXAS.map(([r]) => `<th>${r}</th>`).join('')}</tr></thead>
      <tbody>${areas.map(([nome, a]) => `<tr class="hl"><td>${esc(nome)}</td>${FAIXAS.map(([, idx]) => `<td>${perc(faixa(a, idx), totalFaixas(a))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
    folha('BAIRRO, MUNICÍPIO E ESTADO', 'Evolução populacional e faixa etária', `<div class="cols2 fill"><div class="col">${esquerda}</div><div class="col">${direita}</div></div>`,
      'Fonte: IBGE — estimativas de população (município e estado) e Censo Demográfico 2022 (faixa etária)');
  }

  // Renda
  if (areas.length && areas.some(([, a]) => present(a.rendaMedia))) {
    folha('BAIRRO E MUNICÍPIO', 'Renda — Censo 2022', `
      <div class="cols2 fill">
        <div class="col">
          <div class="chart-box grow"><h3>Rendimento mensal do responsável pelo domicílio (R$)</h3><div class="chart">${G.barrasHorizontais({ categorias: ['Média', 'Mediana'], series: areas.map(([nome, a, cor]) => ({ nome, cor, valores: [a.rendaMedia, a.rendaMediana] })), formato: (v) => money0(v), largura: 464, altura: 525, rotuloLargura: 70, maxBarra: 44, tamRotulo: 13, margemDireita: 84, descricao: 'Rendimento médio e mediano' })}</div></div>
          ${b && indice(b) ? `<div class="destaque"><span>ÍNDICE DE RENDA DO BAIRRO</span><strong>${indice(b)}</strong><small>município = 100</small></div>` : ''}
        </div>
        <div class="col">${tabela([
          ['Rendimento médio mensal do responsável', (a) => money0(a.rendaMedia), 'hl'],
          ['Rendimento mediano mensal do responsável', (a) => money0(a.rendaMediana)],
          ['Rendimento médio em salários mínimos de 2022', (a) => (present(a.rendaMedia) ? `${dec(a.rendaMedia / SM)} sm` : '—')],
          ['Índice de renda (município = 100)', (a) => (indice(a) ?? '—')],
          ['Responsáveis por domicílio', (a) => num(a.responsaveis)],
          ['Massa de renda mensal estimada', (a) => money0(massa(a)), 'hl'],
        ], 'Indicador', 'solto')}${semBairro}
        <p class="src">Valores nominais de 2022 (salário mínimo de ${money0(SM)}). Massa de renda = rendimento médio × responsáveis por domicílio: estimativa de ordem de grandeza, pois a média considera apenas responsáveis com rendimento.</p>
        <div class="chart-box grow"><h3>Onde o rendimento médio e a mediana caem nas classes sociais</h3><div class="chart">${G.reguaClasses({ marcas: areas.flatMap(([nome, a, cor], k) => [present(a.rendaMedia) && { rotulo: `Média ${nome.replace('Bairro ', '')}`, sm: a.rendaMedia / SM, cor }, present(a.rendaMediana) && { rotulo: `Mediana ${nome.replace('Bairro ', '')}`, sm: a.rendaMediana / SM, cor: k ? '#d5ad62' : G.COR.verde2 }]).filter(Boolean), largura: 464, altura: 285 })}</div></div></div>
      </div>`, fonteCenso.replace(/<[^>]+>/g, ''));
  }

  // Rua e entorno
  if (ent) {
    folha('RUA E ENTORNO', 'O que existe ao redor do ponto', `
      <div class="cols2 fill">
        <div class="col chart-box"><h3>Estabelecimentos mapeados por categoria</h3><div class="chart">${G.barrasHorizontais({ categorias: ent.linhas.map((l) => l.rotulo.replace(/ \(.*\)/, '')), series: [{ nome: 'Até 500 m', cor: G.COR.verde, valores: ent.linhas.map((l) => l.r500) }, { nome: 'Até 1 km', cor: G.COR.dourado, valores: ent.linhas.map((l) => l.r1000) }], largura: 464, altura: 588, rotuloLargura: 190, maxBarra: 18, tamRotulo: 11.5, descricao: 'Estabelecimentos por categoria' })}</div></div>
        <div class="col">
          <table class="demo"><thead><tr><th>Transporte</th><th>500 m</th><th>1 km</th></tr></thead><tbody>${ent.transporte.map((l) => `<tr><td>${esc(l.rotulo)}</td><td>${num(l.r500)}</td><td>${num(l.r1000)}</td></tr>`).join('')}<tr class="hl"><td>Total de estabelecimentos</td><td>${num(ent.total500)}</td><td>${num(ent.total1000)}</td></tr></tbody></table>
          ${ent.via ? `<table class="demo"><thead><tr><th colspan="2">A via — ${esc(trunc(ent.via.nome, 36))}</th></tr></thead><tbody><tr><td>Tipo</td><td>${esc(ent.via.tipo)}</td></tr>${ent.via.faixas ? `<tr><td>Faixas</td><td>${esc(ent.via.faixas)}</td></tr>` : ''}${ent.via.maoUnica ? `<tr><td>Sentido</td><td>${esc(ent.via.maoUnica)}</td></tr>` : ''}${ent.via.velocidade ? `<tr><td>Velocidade máxima</td><td>${esc(ent.via.velocidade)}</td></tr>` : ''}</tbody></table>` : ''}
          ${ent.destaques.length ? `<table class="demo"><thead><tr><th>Mais próximo</th><th>Nome</th><th>Dist.</th></tr></thead><tbody>${ent.destaques.slice(0, 7).map((x) => `<tr><td>${esc(x.rotulo)}</td><td>${esc(trunc(x.nome, 26))}</td><td>${num(x.dist)} m</td></tr>`).join('')}</tbody></table>` : ''}
          ${(() => { const cores = [G.COR.verde, G.COR.dourado, G.COR.verde2, '#6f8fa8', G.COR.areia, '#b58b7a']; const cats = ent.linhas.filter((l) => l.r500 > 0).sort((a, c) => c.r500 - a.r500); const topo = cats.slice(0, 5).map((l, k) => ({ rotulo: l.rotulo.replace(/ \(.*\)/, ''), valor: l.r500, cor: cores[k] })); const resto = cats.slice(5).reduce((n, l) => n + l.r500, 0); if (resto) topo.push({ rotulo: 'Demais categorias', valor: resto, cor: cores[5] }); return topo.length > 1 ? `<div class="chart-box grow"><h3>Composição do comércio e serviços em 500 m</h3><div class="chart">${G.rosca({ fatias: topo, centro: { valor: num(ent.total500), titulo: 'estabelecimentos' }, largura: 464, altura: 184, descricao: 'Composição do entorno' })}</div></div>` : ''; })()}
          ${ent.naRua.length ? `<p class="na-rua"><strong>Na mesma rua ou vizinhos imediatos:</strong> ${ent.naRua.slice(0, 8).map((n) => esc(trunc(n.nome, 28))).join(' · ')}.</p>` : ''}
        </div>
      </div>`, `Fonte: OpenStreetMap (Overpass API), consulta de ${new Date(ent.consultadoEm || Date.now()).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · mapeamento colaborativo: contagens indicam o mínimo existente`);
  }

  // Síntese: indicadores-chave + leitura
  const kpis = [
    base && ['População', num(base.populacao), `${esc(areas[0][0])}`],
    base && present(base.densidade) && ['Densidade', `${num(Math.round(base.densidade))}`, 'hab/km²'],
    base && present(base.rendaMedia) && ['Renda média', money0(base.rendaMedia), 'do responsável'],
    b && indice(b) && ['Índice de renda', String(indice(b)), 'município = 100'],
    base && present(base.domiciliosVagos) && base.domicilios && ['Domicílios vagos', perc(base.domiciliosVagos, base.domicilios), 'do total'],
    base && present(base.moradoresPorDomicilio) && ['Moradores/domicílio', dec(base.moradoresPorDomicilio), 'média'],
    ent && ['Estabelecimentos', num(ent.total500), 'até 500 m'],
    ent && ['Transporte', num((ent.transporte[0]?.r500 || 0) + (ent.transporte[1]?.r500 || 0)), 'pontos até 500 m'],
  ].filter(Boolean);
  const razao = (x, y) => (present(x) && present(y) && Number(y) ? (Number(x) / Number(y)) * 100 : null);
  const comparativo = b && m ? [
    { rotulo: 'Renda média', valor: razao(b.rendaMedia, m.rendaMedia) },
    { rotulo: 'Renda mediana', valor: razao(b.rendaMediana, m.rendaMediana) },
    { rotulo: 'Densidade', valor: razao(b.densidade, m.densidade) },
    { rotulo: 'Moradores/domicílio', valor: razao(b.moradoresPorDomicilio, m.moradoresPorDomicilio) },
    { rotulo: 'Domicílios vagos', valor: razao(b.domiciliosVagos / b.domicilios, m.domiciliosVagos / m.domicilios) },
    { rotulo: 'População 60+', valor: razao(faixa(b, [9, 10]) / totalFaixas(b), faixa(m, [9, 10]) / totalFaixas(m)) },
  ].filter((c) => c.valor !== null).map((c) => ({ ...c, valor: Math.round(c.valor) })) : [];
  if (kpis.length || leitura.length) {
    folha('SÍNTESE', 'Leitura dos dados', `
      ${kpis.length ? `<div class="kpis">${kpis.map(([t, v, s]) => `<div><span>${esc(t)}</span><strong>${esc(v)}</strong><small>${s}</small></div>`).join('')}</div>` : ''}
      <div class="cols2 fill sintese">
        ${leitura.length ? `<div class="col"><h3 class="sub"><span>01</span>O que os números dizem</h3><ul class="findings fortes leitura">${L(leitura, 6, 260)}</ul></div>` : '<div></div>'}
        ${comparativo.length ? `<div class="col chart-box"><h3>Bairro em relação ao município (município = 100)</h3><div class="chart">${G.barrasIndice({ itens: comparativo, largura: 464, altura: 388, descricao: 'Bairro em relação ao município' })}</div></div>` : ''}
      </div>`,
    'Síntese gerada a partir das páginas anteriores · não inclui fluxo de pedestres, concorrência qualificada nem potencial de consumo, que dependem de campo');
  }

  // Triagem cadastral
  folha('DIAGNÓSTICO CADASTRAL', `Triagem do ponto — ${esc(imovel.codigo)}`, `
    <div class="triagem-topo">
      <div class="score-line"><div class="score-ring" style="background:conic-gradient(var(--gold) ${pct}%, #e7ebe6 0)"><span>${esc(score)}</span></div>
      <div><strong>Score de triagem cadastral</strong><p class="muted">${esc(trunc(analise?.resumo || '', 260))}</p></div></div>
      ${ai.recomendacao ? `<div class="recommend"><strong>Recomendação</strong><p>${esc(trunc(ai.recomendacao, 260))}</p></div>` : ''}
    </div>
    <div class="cols2 fill">
      <section><h3 class="sub"><span>01</span>Pontos fortes</h3><ul class="findings fortes grande">${L(ai.pontosFortes, 6, 150)}</ul></section>
      <section><h3 class="sub"><span>02</span>Pontos de atenção</h3><ul class="findings atencao grande">${L(ai.pontosAtencao, 6, 150)}</ul></section>
    </div>
    <div class="rodape-triagem">
      ${(ai.segmentosRecomendados || []).length ? `<div><h3 class="sub"><span>03</span>Segmentos recomendados</h3><div class="tags">${ai.segmentosRecomendados.slice(0, 8).map((x) => `<span class="tag">${esc(trunc(x, 40))}</span>`).join('')}</div></div>` : ''}
      ${ai.aviso ? `<p class="aviso"><strong>Importante:</strong> ${esc(trunc(ai.aviso, 330))}</p>` : ''}
    </div>`, `Modelo: ${analise?.modelo || 'triagem-interna'} · Prospecção Brasil`);

  // Encerramento
  const faltando = [!areas.length && 'dados do Censo 2022 (município não identificado na base do IBGE)', !ent && 'entorno da rua (serviço de mapas indisponível; abra o documento novamente em alguns minutos)'].filter(Boolean);
  folha('ENCERRAMENTO', 'Limitações e uso do documento', `
    <div class="cols2">
      <div class="col texto"><ul>
        <li>Séries populacionais (município e estado): estimativas oficiais IBGE com projeção por TGCA.</li>
        <li>População, domicílios, faixa etária e rendimento: Censo Demográfico 2022 (IBGE), nos recortes de bairro e município.</li>
        <li>Domicílios por classe social: estimativa estatística a partir do rendimento do responsável; não é contagem oficial.</li>
        <li>Entorno da rua: OpenStreetMap. A cobertura varia por região; ausência de um estabelecimento no mapa não prova que ele não existe.</li>
        <li>A triagem cadastral é heurística: deriva exclusivamente dos dados do imóvel e não substitui estudo de mercado.</li>
      </ul></div>
      <div class="col texto"><ul>
        <li>Mapa: OpenStreetMap; centro obtido por geocodificação do endereço quando o cadastro não tem coordenadas.</li>
        <li>Quando habilitado, provedor externo de IA recebe somente atributos físicos/comerciais do ponto.</li>
        <li>Documento interno Prospecção Brasil — não apresentar a terceiros como estudo de mercado concluído.</li>
        <li>Disponibilidade e condições do imóvel sujeitas a confirmação.</li>
        ${faltando.map((f) => `<li class="alerta"><strong>Seção omitida:</strong> ${f}.</li>`).join('')}
      </ul></div>
    </div>
    <div class="contato-final"><div><span>FALE COM A PROSPECÇÃO BRASIL</span><strong>Luiz Claudio P.</strong></div><div><span>WHATSAPP</span><strong>(21) 9 9842-3232</strong></div><div><span>E-MAIL</span><strong>comercial@prospeccaobrasil.com.br</strong></div><div><span>SITE</span><strong>prospeccaobrasil.com.br</strong></div></div>
    <div class="assinatura"><img class="logo" src="/images/logo-wide.png" alt="Prospecção Brasil"><p>CONEXÕES QUE EXPANDEM POSSIBILIDADES</p></div>`);

  const total = folhas.length + 1; // + capa
  const capa = `<article class="sheet cover">
  <div class="geo-brand">G E O M A R K E T I N G</div>
  <div class="cover-grid">
    <div class="cover-left">
      <img class="cover-logo" src="/images/logo-wide.png" alt="Prospecção Brasil">
      <div class="cover-mid">
        <div class="eyebrow">Geomarketing · bairro e rua</div>
        <h1>Inteligência<br>de mercado</h1>
        <div class="cover-rule"></div>
        <div class="cover-place">${esc(local)}</div>
        <p class="cover-sub">${esc(trunc(imovel.titulo || address(imovel), 90))}</p>
      </div>
      <div class="cover-bottom"><span>PROSPECÇÃO BRASIL · RETAIL &amp; REAL ESTATE</span><span>${esc(dataDoc)} · ${esc(imovel.codigo)}</span></div>
    </div>
    <div class="cover-right"${foto ? ` style="background-image:linear-gradient(rgba(21,60,52,.25),rgba(21,60,52,.55)),url('${esc(foto.arquivo)}')"` : ''}>
      <div class="cover-right-inner"><span class="cover-code">${esc(imovel.codigo)}</span><span class="cover-tag">${esc(imovel.cidade || '')}${imovel.uf ? ` · ${esc(imovel.uf)}` : ''}</span></div>
    </div>
  </div>
</article>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(imovel.codigo)} - Inteligência de mercado</title><style>${styles}</style></head><body>
<nav class="toolbar"><div><strong>Inteligência de mercado</strong><span>Documento geomarketing · A4 paisagem · ${total} folhas · ${esc(imovel.codigo)}</span></div><button type="button" onclick="window.print()">Imprimir / Salvar PDF</button></nav>
<main>${capa}${folhas.map((f, n) => f(n + 2, total)).join('\n')}</main>
<p class="print-help">Documento em A4 paisagem — ao salvar em PDF, escolha papel A4, orientação "Paisagem", margens "Nenhuma" e ative "Gráficos de plano de fundo".</p>
</body></html>`;
}

module.exports = { renderInteligencia };
