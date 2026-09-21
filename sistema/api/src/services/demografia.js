// Dados reais para o relatório geomarketing:
// - IBGE agregado 6579: série de população estimada (município + UF) e projeção TGCA
// - IBGE Censo 2010: faixa etária, sexo, classes de rendimento e renda média (município)
// - Nominatim/OSM: geocodificação do endereço + tiles para mapa real
// Cache em memória 24h (IBGE atualiza anualmente; Nominatim pede uso moderado).

const CACHE = new Map();
const TTL = 24 * 60 * 60 * 1000;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const IBGE = 'https://servicodados.ibge.gov.br/api/v3/agregados';
const UF_ID = { AC: 12, AL: 27, AP: 16, AM: 13, BA: 29, CE: 23, DF: 53, ES: 32, GO: 52, MA: 21, MT: 51, MS: 50, MG: 31, PA: 15, PB: 25, PR: 41, PE: 26, PI: 22, RJ: 33, RN: 24, RS: 43, RO: 11, RR: 14, SC: 42, SP: 35, SE: 28, TO: 17 };
const GRUPOS_IDADE = [0, 1140, 1141, 1142, 1143, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 1152, 1153, 1154, 1155, 6802, 6803, 92963, 92964];

async function fetchJson(url, ua) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'Accept-Encoding': 'gzip', ...(ua ? { 'User-Agent': ua } : {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 90)}`);
  return r.json();
}
async function cached(key, fn) {
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const v = await fn();
  CACHE.set(key, { t: Date.now(), v });
  return v;
}

async function municipioId(nome, uf) {
  const list = await cached(`mun:${uf}`, () =>
    fetchJson(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios`));
  const m = (list || []).find((x) => norm(x.nome) === norm(nome));
  return m ? { id: m.id, nome: m.nome } : null;
}

async function seriePopulacao(nivel, id) {
  const data = await cached(`pop:${nivel}:${id}`, () =>
    fetchJson(`${IBGE}/6579/periodos/-6/variaveis/9324?localidades=${nivel}%5B${id}%5D`));
  const serie = data?.[0]?.resultados?.[0]?.series?.[0];
  if (!serie) return null;
  const anos = Object.entries(serie.serie)
    .map(([ano, v]) => [Number(ano), Number(String(v).replace(/\D/g, ''))])
    .filter(([, v]) => Number.isFinite(v))
    .sort((a, b) => a[0] - b[0]);
  return { nome: serie.localidade.nome, anos: Object.fromEntries(anos) };
}

function projetar(serie) {
  const anos = Object.keys(serie.anos).map(Number).sort((a, b) => a - b);
  if (anos.length < 2) return { anos, serie: serie.anos, tgca: null };
  const base = anos[anos.length - 1];
  const tgca = Math.pow(serie.anos[base] / serie.anos[anos[0]], 1 / (base - anos[0])) - 1;
  const proj = { ...serie.anos };
  proj[base + 2] = Math.round(serie.anos[base] * Math.pow(1 + tgca, 2));
  proj[base + 4] = Math.round(serie.anos[base] * Math.pow(1 + tgca, 4));
  return { anos: [base, base + 2, base + 4], serie: proj, tgca, anoBase: base };
}

// Censo 2010: sexo, faixa etária, classes de rendimento per capita, renda média
async function censoMunicipio(munId) {
  const [idade, classes, renda] = await Promise.all([
    cached(`id:${munId}`, () => fetchJson(
      `${IBGE}/200/periodos/2010/variaveis/93?localidades=N6%5B${munId}%5D&classificacao=2%5B0,4,5%5D|1%5B0%5D|58%5B${GRUPOS_IDADE.join(',')}%5D`)),
    cached(`cl:${munId}`, () => fetchJson(
      `${IBGE}/1427/periodos/2010/variaveis/96?localidades=N6%5B${munId}%5D&classificacao=386%5Ball%5D|1%5B0%5D`)),
    cached(`rd:${munId}`, () => fetchJson(
      `${IBGE}/3974/periodos/2010/variaveis/3948?localidades=N6%5B${munId}%5D`)),
  ]);

  const cat = (s, id) => s.classificacoes?.find((c) => c.id === String(id))?.categoria || {};
  const val = (s) => {
    const v = Object.values(s.series?.[0]?.serie || {})[0];
    return v && v !== '...' ? Number(v) : null;
  };
  const res = idade?.[0]?.resultados || [];
  const faixaEtaria = {}; const sexoSimples = {};
  for (const s of res) {
    const g = cat(s, 58), sx = cat(s, 2);
    const gk = Object.keys(g)[0], sk = Object.keys(sx)[0];
    if (gk === '0' && sk === '4') sexoSimples.homens = val(s);
    else if (gk === '0' && sk === '5') sexoSimples.mulheres = val(s);
    else if (gk !== '0' && sk === '0') faixaEtaria[g[gk]] = val(s);
  }
  const classesRendimento = (classes?.[0]?.resultados || [])
    .map((s) => ({ faixa: Object.values(cat(s, 386))[0] || '', total: val(s) }))
    .filter((c) => c.faixa && c.faixa !== 'Total');
  const rendaPerCapita = renda?.[0]?.resultados?.[0]?.series?.[0]?.serie?.['2010'];
  return {
    faixaEtaria,
    sexo: Object.keys(sexoSimples).length ? sexoSimples : null,
    classesRendimento,
    rendaPerCapita: rendaPerCapita && rendaPerCapita !== '...' ? Number(rendaPerCapita) : null,
  };
}

// Coordenadas: usa cadastro ou geocodifica endereço via Nominatim (OSM)
async function geocode(imovel) {
  const lat = Number(imovel.latitude), lon = Number(imovel.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon, fonte: 'cadastro' };
  const q = [imovel.endereco && `${imovel.endereco}${imovel.numero ? `, ${imovel.numero}` : ''}`, imovel.bairro, imovel.cidade, imovel.uf, 'Brasil'].filter(Boolean).join(', ');
  if (!imovel.cidade) return null;
  try {
    const r = await cached(`geo:${norm(q)}`, () => fetchJson(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`,
      'prospeccao-brasil-inteligencia/1.0'));
    const g = r?.[0];
    return g ? { lat: Number(g.lat), lon: Number(g.lon), fonte: 'geocodificação do endereço (OSM)' } : null;
  } catch { return null; }
}

// Tiles OSM (4x3 em zoom 15) + posição dos raios 1km/2km em pixels
function mapa(geo) {
  if (!geo) return null;
  const z = 15, n = 2 ** z, ts = 256, cols = 3, rows = 3;
  const fx = (geo.lon + 180) / 360 * n;
  const fy = (1 - Math.log(Math.tan(geo.lat * Math.PI / 180) + 1 / Math.cos(geo.lat * Math.PI / 180)) / Math.PI) / 2 * n;
  const cx = Math.floor(fx), cy = Math.floor(fy);
  const ox = cx - Math.floor(cols / 2), oy = cy - Math.floor(rows / 2);
  const tiles = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
    tiles.push({ x: ox + x, y: oy + y, left: x * ts, top: y * ts });
  const px = (fx - ox) * ts, py = (fy - oy) * ts;
  const mpp = 156543.03392 * Math.cos(geo.lat * Math.PI / 180) / n;
  return { z, tiles, w: cols * ts, h: rows * ts, px, py, r1: 1000 / mpp, r2: 2000 / mpp };
}

async function demografia(imovel) {
  try {
    if (!imovel.cidade || !imovel.uf) return null;
    const uf = String(imovel.uf).toUpperCase();
    const mun = await municipioId(imovel.cidade, uf);
    const [serieMun, serieUF, censo, geo] = await Promise.all([
      mun ? seriePopulacao('N6', mun.id) : null,
      seriePopulacao('N3', UF_ID[uf]),
      mun ? censoMunicipio(mun.id).catch(() => null) : null,
      geocode(imovel).catch(() => null),
    ]);
    return {
      municipio: serieMun ? { nome: serieMun.nome, ...projetar(serieMun) } : null,
      uf: serieUF ? { nome: serieUF.nome, ...projetar(serieUF) } : null,
      censo2010: censo,
      geo,
      mapa: mapa(geo),
      fonte: 'Estimativas de população — IBGE (agregado 6579) · Universo Censo Demográfico 2010 — IBGE',
    };
  } catch (e) {
    console.error('Demografia indisponível:', e.message);
    return null;
  }
}

module.exports = { demografia };
