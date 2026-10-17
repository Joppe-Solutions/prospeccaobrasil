// Gráficos em SVG puro para o relatório de inteligência. Cada função devolve um <svg> que escala
// para o espaço disponível (viewBox + width/height 100%), então cabem exatamente na folha A4.
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const COR = { verde: '#153c34', verde2: '#4f9e78', verde3: '#a9cbb9', dourado: '#a27a35', areia: '#e3d4ac', cinza: '#c9d1cc', texto: '#67756f', linha: '#dce3dd', fundo: '#f4f6f1' };
const fonte = 'Arial, Helvetica, sans-serif';

const pt = (v, casas = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const compacto = (v) => (v >= 1e6 ? `${pt(v / 1e6, 3)} mi` : v >= 1e3 ? `${pt(v / 1e3, 1)} mil` : pt(v));
const finito = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

function svg(largura, altura, corpo, descricao) {
  return `<svg class="grafico" viewBox="0 0 ${largura} ${altura}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(descricao)}" font-family="${fonte}">${corpo}</svg>`;
}
const txt = (x, y, conteudo, { tam = 11, cor = COR.texto, peso = 400, ancora = 'start' } = {}) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${tam}" fill="${cor}" font-weight="${peso}" text-anchor="${ancora}">${esc(conteudo)}</text>`;

function legenda(itens, x, y, { tam = 10.5, passo = 18, horizontal = true } = {}) {
  let cursor = x;
  return itens.map((it, n) => {
    const largura = String(it.nome).length * tam * 0.56 + 26;
    const bloco = `<rect x="${(horizontal ? cursor : x).toFixed(1)}" y="${(horizontal ? y : y + n * passo).toFixed(1)}" width="10" height="10" rx="2" fill="${it.cor}"/>${txt((horizontal ? cursor : x) + 15, (horizontal ? y : y + n * passo) + 9, it.nome, { tam, cor: COR.texto })}`;
    cursor += largura;
    return bloco;
  }).join('');
}

/** Barras verticais agrupadas: categorias no eixo X, uma barra por série. formato(v) escreve o rótulo do valor. */
function barrasAgrupadas({ categorias, series, formato = (v) => pt(v, 1), largura = 640, altura = 320, descricao = 'Gráfico de barras', maximo }) {
  const m = { e: 14, d: 14, t: 34, b: 30 };
  const area = { w: largura - m.e - m.d, h: altura - m.t - m.b };
  const teto = (maximo ?? Math.max(...series.flatMap((s) => s.valores.filter(finito).map(Number)), 1)) * 1.15;
  const grupo = area.w / categorias.length;
  const largBarra = Math.min(46, (grupo * 0.72) / series.length);
  let corpo = `<line x1="${m.e}" y1="${m.t + area.h}" x2="${largura - m.d}" y2="${m.t + area.h}" stroke="${COR.linha}" stroke-width="1.2"/>`;
  for (let g = 1; g <= 3; g += 1) {
    const y = m.t + area.h - (area.h * g) / 4;
    corpo += `<line x1="${m.e}" y1="${y}" x2="${largura - m.d}" y2="${y}" stroke="${COR.linha}" stroke-width=".6" stroke-dasharray="3 4"/>`;
  }
  categorias.forEach((cat, c) => {
    const cx = m.e + grupo * c + grupo / 2;
    series.forEach((s, k) => {
      const v = s.valores[c];
      if (!finito(v)) return;
      const h = Math.max(1.5, (Number(v) / teto) * area.h);
      const x = cx - (largBarra * series.length) / 2 + k * largBarra;
      corpo += `<rect x="${x.toFixed(1)}" y="${(m.t + area.h - h).toFixed(1)}" width="${(largBarra - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${s.cores?.[c] || s.cor}"/>`;
      corpo += txt(x + (largBarra - 2) / 2, m.t + area.h - h - 5, formato(Number(v)), { tam: 10, cor: COR.verde, peso: 700, ancora: 'middle' });
    });
    corpo += txt(cx, altura - 10, cat, { tam: 11.5, cor: COR.verde, peso: 700, ancora: 'middle' });
  });
  if (series.some((s) => s.nome)) corpo += legenda(series.map((s) => ({ nome: s.nome, cor: s.cor })), m.e, 8);
  return svg(largura, altura, corpo, descricao);
}

/** Barras verticais simples; itens: [{ rotulo, valor, cor? }] */
function barras({ itens, largura = 520, altura = 300, descricao = 'Gráfico de barras', formato = (v) => pt(v) }) {
  return barrasAgrupadas({
    categorias: itens.map((i) => i.rotulo),
    series: [{ nome: '', cor: COR.verde, cores: itens.map((i) => i.cor), valores: itens.map((i) => i.valor) }],
    largura, altura, descricao, formato,
  });
}

/** Barras horizontais agrupadas (ex.: 500 m × 1 km por categoria). */
function barrasHorizontais({ categorias, series, formato = (v) => pt(v), largura = 560, altura = 360, rotuloLargura = 190, maxBarra = 14, tamRotulo = 11, margemDireita = 46, descricao = 'Gráfico de barras horizontais' }) {
  const m = { t: 26, b: 6, d: margemDireita };
  const area = { w: largura - rotuloLargura - m.d, h: altura - m.t - m.b };
  const teto = Math.max(...series.flatMap((s) => s.valores.filter(finito).map(Number)), 1);
  const linha = area.h / categorias.length;
  const alt = Math.min(maxBarra, (linha * 0.74) / series.length);
  let corpo = legenda(series.map((s) => ({ nome: s.nome, cor: s.cor })), rotuloLargura, 4);
  categorias.forEach((cat, c) => {
    const y0 = m.t + linha * c + (linha - alt * series.length) / 2;
    corpo += txt(rotuloLargura - 8, y0 + (alt * series.length) / 2 + 4, cat, { tam: tamRotulo, cor: COR.verde, ancora: 'end' });
    series.forEach((s, k) => {
      const v = s.valores[c];
      if (!finito(v)) return;
      const w = Math.max(1.5, (Number(v) / teto) * area.w);
      const y = y0 + k * alt;
      corpo += `<rect x="${rotuloLargura}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(alt - 1.5).toFixed(1)}" rx="2" fill="${s.cor}"/>`;
      corpo += txt(rotuloLargura + w + 5, y + alt - Math.max(3.5, (alt - 9) / 2), formato(Number(v)), { tam: Math.min(12, 8 + alt / 4), cor: COR.verde, peso: 700 });
    });
  });
  corpo = `<line x1="${rotuloLargura}" y1="${m.t - 2}" x2="${rotuloLargura}" y2="${altura - m.b}" stroke="${COR.linha}" stroke-width="1.2"/>${corpo}`;
  return svg(largura, altura, corpo, descricao);
}

/**
 * Pirâmide etária: faixas do mais velho (topo) ao mais novo; esquerda × direita em % do total.
 * rotulos/esquerda/direita na ordem do mais novo ao mais velho.
 */
function piramide({ rotulos, esquerda, direita, nomes = ['Homens', 'Mulheres'], cores = [COR.verde, COR.dourado], largura = 560, altura = 340, descricao = 'Pirâmide etária' }) {
  const total = [...esquerda, ...direita].filter(finito).reduce((a, b) => a + Number(b), 0) || 1;
  const pct = (v) => (Number(v) / total) * 100;
  const maximo = Math.max(...[...esquerda, ...direita].filter(finito).map(pct), 1);
  const centro = largura / 2;
  const meio = 38; // largura da coluna de rótulos
  const lado = centro - meio / 2 - 44;
  const topo = 30;
  const linha = (altura - topo - 8) / rotulos.length;
  const alt = linha * 0.72;
  let corpo = legenda([{ nome: nomes[0], cor: cores[0] }], centro - meio / 2 - 90, 6) + legenda([{ nome: nomes[1], cor: cores[1] }], centro + meio / 2 + 30, 6);
  for (let n = 0; n < rotulos.length; n += 1) {
    const i = rotulos.length - 1 - n;
    const y = topo + n * linha + (linha - alt) / 2;
    const wE = finito(esquerda[i]) ? (pct(esquerda[i]) / maximo) * lado : 0;
    const wD = finito(direita[i]) ? (pct(direita[i]) / maximo) * lado : 0;
    corpo += `<rect x="${(centro - meio / 2 - wE).toFixed(1)}" y="${y.toFixed(1)}" width="${wE.toFixed(1)}" height="${alt.toFixed(1)}" rx="2" fill="${cores[0]}"/>`;
    corpo += `<rect x="${(centro + meio / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${wD.toFixed(1)}" height="${alt.toFixed(1)}" rx="2" fill="${cores[1]}"/>`;
    corpo += txt(centro, y + alt - 2.5, rotulos[i], { tam: 10, cor: COR.verde, peso: 700, ancora: 'middle' });
    if (finito(esquerda[i])) corpo += txt(centro - meio / 2 - wE - 4, y + alt - 2.5, `${pt(pct(esquerda[i]), 1)}%`, { tam: 9, cor: COR.verde, ancora: 'end' });
    if (finito(direita[i])) corpo += txt(centro + meio / 2 + wD + 4, y + alt - 2.5, `${pt(pct(direita[i]), 1)}%`, { tam: 9, cor: COR.verde });
  }
  return svg(largura, altura, corpo, descricao);
}

/** Rosca com valor no centro; fatias: [{ rotulo, valor, cor }] */
function rosca({ fatias, centro = {}, largura = 330, altura = 230, descricao = 'Gráfico de rosca' }) {
  const total = fatias.reduce((a, f) => a + (finito(f.valor) ? Number(f.valor) : 0), 0);
  if (!total) return '';
  const r = Math.min(altura / 2 - 18, 88), esp = Math.round(r * 0.4), cx = r + esp / 2 + 14, cy = altura / 2;
  let angulo = -Math.PI / 2;
  let corpo = '';
  fatias.forEach((f) => {
    if (!finito(f.valor) || !f.valor) return;
    const passo = (Number(f.valor) / total) * Math.PI * 2;
    const fim = angulo + Math.min(passo, Math.PI * 2 - 0.0001);
    const [x1, y1, x2, y2] = [cx + r * Math.cos(angulo), cy + r * Math.sin(angulo), cx + r * Math.cos(fim), cy + r * Math.sin(fim)];
    corpo += `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${passo > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" fill="none" stroke="${f.cor}" stroke-width="${esp}"/>`;
    angulo += passo;
  });
  if (centro.valor) corpo += txt(cx, cy + 2, centro.valor, { tam: 19, cor: COR.verde, peso: 700, ancora: 'middle' }) + txt(cx, cy + 18, centro.titulo || '', { tam: 9.5, cor: COR.texto, ancora: 'middle' });
  fatias.forEach((f, n) => {
    const passo = Math.min(36, (altura - 28) / fatias.length);
    const y = cy - (fatias.length * passo) / 2 + n * passo + passo / 2 - 4;
    const lx = cx + r + esp / 2 + 28;
    const resumo = `${pt(f.valor)} · ${pt((Number(f.valor) / total) * 100, 1)}%`;
    corpo += passo >= 30
      ? `<rect x="${lx}" y="${y - 6}" width="11" height="11" rx="2" fill="${f.cor}"/>${txt(lx + 17, y + 3, f.rotulo, { tam: 12, cor: COR.verde, peso: 700 })}${txt(lx + 17, y + 17, resumo, { tam: 10.5, cor: COR.texto })}`
      : `<rect x="${lx}" y="${y - 4}" width="10" height="10" rx="2" fill="${f.cor}"/>${txt(lx + 16, y + 5, `${f.rotulo} — ${resumo}`, { tam: 10.5, cor: COR.verde })}`;
  });
  return svg(largura, altura, corpo, descricao);
}

/** Barras 100% empilhadas, uma por linha: linhas [{ rotulo, partes: [{ rotulo, valor, cor }] }] */
function barraEmpilhada({ linhas, largura = 520, altura: alvo, descricao = 'Gráfico de barras empilhadas' }) {
  const rotuloL = 92, topo = 24;
  const passo = alvo ? Math.min(96, (alvo - topo - 34) / linhas.length) : 50, altBarra = Math.min(44, passo * 0.54);
  const altura = alvo || topo + linhas.length * passo + 28;
  let corpo = '';
  const legendaItens = [];
  linhas.forEach((l, n) => {
    const total = l.partes.reduce((a, p) => a + (finito(p.valor) ? Number(p.valor) : 0), 0) || 1;
    const y = topo + n * passo;
    corpo += txt(rotuloL - 8, y + altBarra / 2 + 4, l.rotulo, { tam: 11, cor: COR.verde, peso: 700, ancora: 'end' });
    let x = rotuloL;
    const larg = largura - rotuloL - 6;
    l.partes.forEach((p) => {
      if (!finito(p.valor) || !p.valor) return;
      const w = (Number(p.valor) / total) * larg;
      corpo += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${altBarra}" fill="${p.cor}"/>`;
      if (w > 38) corpo += txt(x + w / 2, y + altBarra / 2 + 4, `${pt((Number(p.valor) / total) * 100, 1)}%`, { tam: 10, cor: '#fff', peso: 700, ancora: 'middle' });
      x += w;
      if (!legendaItens.some((i) => i.nome === p.rotulo)) legendaItens.push({ nome: p.rotulo, cor: p.cor });
    });
  });
  corpo += legenda(legendaItens, rotuloL, topo + linhas.length * passo + 4);
  return svg(largura, altura, corpo, descricao);
}

/** Régua de classes sociais (0 a 25 salários mínimos) com marcas: [{ rotulo, sm, cor }] */
function reguaClasses({ marcas, largura = 520, altura, descricao = 'Posição do rendimento nas classes sociais' }) {
  const bandas = [['E', 0, 1, '#e7eee9'], ['D', 1, 2, '#d3e2d9'], ['C2', 2, 4, '#b9d3c5'], ['C1', 4, 6, '#98bfa9'], ['B2', 6, 10, '#6da480'], ['B1', 10, 15, '#3f8a68'], ['A2', 15, 20, '#25624b'], ['A1', 20, 25, COR.verde]];
  const passoMarca = altura ? Math.min(30, Math.max(20, (altura - 130) / marcas.length)) : 20;
  const x0 = 14, w = largura - 28, topo = 18 + marcas.length * passoMarca + 6, h = altura ? Math.min(90, Math.max(30, altura - topo - 28)) : 30;
  const px = (sm) => x0 + (Math.min(Math.max(sm, 0), 25) / 25) * w;
  let corpo = bandas.map(([id, de, ate, cor]) => `<rect x="${px(de).toFixed(1)}" y="${topo}" width="${(px(ate) - px(de)).toFixed(1)}" height="${h}" fill="${cor}"/>${txt((px(de) + px(ate)) / 2, topo + h / 2 + 4, id, { tam: id.length > 1 ? 10 : 9, cor: de >= 6 ? '#fff' : COR.verde, peso: 700, ancora: 'middle' })}`).join('');
  [0, 5, 10, 15, 20, 25].forEach((sm) => { corpo += txt(px(sm), topo + h + 15, `${sm} sm`, { tam: 9, ancora: 'middle' }); });
  marcas.forEach((mk, n) => {
    const x = px(mk.sm), y = 16 + n * passoMarca;
    const direita = x < largura * 0.62;
    corpo += `<line x1="${x.toFixed(1)}" y1="${y + 3}" x2="${x.toFixed(1)}" y2="${topo + h}" stroke="${mk.cor}" stroke-width="2"/><circle cx="${x.toFixed(1)}" cy="${y + 3}" r="4" fill="${mk.cor}"/>`;
    corpo += txt(direita ? x + 9 : x - 9, y + 7, `${mk.rotulo}: ${pt(mk.sm, 1)} sm${mk.sm > 25 ? ' (acima da escala)' : ''}`, { tam: 10.5, cor: COR.verde, peso: 700, ancora: direita ? 'start' : 'end' });
  });
  return svg(largura, topo + h + 24, corpo, descricao);
}

/** Barras horizontais de índice (referência = 100): itens [{ rotulo, valor }] */
function barrasIndice({ itens, referencia = 100, rotuloReferencia = 'Município = 100', largura = 520, altura = 240, rotuloLargura = 150, descricao = 'Índices em relação ao município' }) {
  const validos = itens.filter((i) => finito(i.valor));
  if (!validos.length) return '';
  const teto = Math.max(referencia, ...validos.map((i) => Number(i.valor))) * 1.12;
  const topo = 22, area = largura - rotuloLargura - 54, linha = (altura - topo - 6) / validos.length, alt = Math.min(24, linha * 0.62);
  const xRef = rotuloLargura + (referencia / teto) * area;
  let corpo = validos.map((it, n) => {
    const y = topo + n * linha + (linha - alt) / 2, v = Number(it.valor), wv = (v / teto) * area;
    return txt(rotuloLargura - 8, y + alt / 2 + 4, it.rotulo, { tam: 11, cor: COR.verde, ancora: 'end' })
      + `<rect x="${rotuloLargura}" y="${y.toFixed(1)}" width="${wv.toFixed(1)}" height="${alt.toFixed(1)}" rx="2" fill="${v >= referencia ? COR.verde : COR.dourado}"/>`
      + txt(rotuloLargura + wv + 6, y + alt / 2 + 4, pt(v), { tam: 11, cor: COR.verde, peso: 700 });
  }).join('');
  corpo += `<line x1="${xRef.toFixed(1)}" y1="${topo - 6}" x2="${xRef.toFixed(1)}" y2="${altura - 4}" stroke="${COR.texto}" stroke-width="1.2" stroke-dasharray="4 3"/>${txt(xRef, 12, rotuloReferencia, { tam: 9.5, ancora: 'middle' })}`;
  return svg(largura, altura, corpo, descricao);
}

/**
 * Linha com pontos: itens [{ rotulo, valor, projecao? }]. O eixo Y é ajustado à faixa dos dados (não parte do
 * zero), porque séries de população variam pouco e barras iguais não informam nada. Projeção em tracejado.
 */
function linha({ itens, largura = 464, altura = 360, formato = compacto, descricao = 'Gráfico de linha' }) {
  const validos = itens.filter((i) => finito(i.valor));
  if (validos.length < 2) return '';
  const minimo = Math.min(...validos.map((i) => Number(i.valor))), maximo = Math.max(...validos.map((i) => Number(i.valor)));
  const folga = Math.max((maximo - minimo) * 0.35, maximo * 0.002);
  const [y0, y1] = [minimo - folga, maximo + folga];
  const m = { e: 62, d: 22, t: 28, b: 34 };
  const area = { w: largura - m.e - m.d, h: altura - m.t - m.b };
  const px = (i) => m.e + (area.w * i) / Math.max(validos.length - 1, 1);
  const py = (v) => m.t + area.h - ((Number(v) - y0) / (y1 - y0)) * area.h;
  let corpo = '';
  for (let g = 0; g <= 4; g += 1) {
    const v = y0 + ((y1 - y0) * g) / 4, y = py(v);
    corpo += `<line x1="${m.e}" y1="${y.toFixed(1)}" x2="${largura - m.d}" y2="${y.toFixed(1)}" stroke="${COR.linha}" stroke-width="${g === 0 ? 1.2 : 0.7}" ${g ? 'stroke-dasharray="3 4"' : ''}/>${txt(m.e - 8, y + 3.5, formato(v), { tam: 10, ancora: 'end' })}`;
  }
  const trecho = (de, ate, tracejado) => {
    const pts = validos.slice(de, ate + 1).map((it, k) => `${px(de + k).toFixed(1)},${py(it.valor).toFixed(1)}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${tracejado ? COR.dourado : COR.verde}" stroke-width="3" stroke-linejoin="round" ${tracejado ? 'stroke-dasharray="7 5"' : ''}/>`;
  };
  const primeiraProj = validos.findIndex((i) => i.projecao);
  if (primeiraProj === -1) corpo += trecho(0, validos.length - 1, false);
  else { if (primeiraProj > 0) corpo += trecho(0, primeiraProj - 1, false); corpo += trecho(Math.max(primeiraProj - 1, 0), validos.length - 1, true); }
  validos.forEach((it, i) => {
    const cor = it.projecao ? COR.dourado : COR.verde;
    corpo += `<circle cx="${px(i).toFixed(1)}" cy="${py(it.valor).toFixed(1)}" r="5" fill="#fff" stroke="${cor}" stroke-width="2.5"/>`;
    corpo += txt(px(i), py(it.valor) - 11, formato(Number(it.valor)), { tam: 10.5, cor: COR.verde, peso: 700, ancora: 'middle' });
    corpo += txt(px(i), altura - 12, it.rotulo, { tam: 11, cor: COR.verde, peso: 700, ancora: 'middle' });
  });
  return svg(largura, altura, corpo, descricao);
}

module.exports = { linha, reguaClasses, barrasIndice, COR, barras, barrasAgrupadas, barrasHorizontais, piramide, rosca, barraEmpilhada, pt, compacto };
