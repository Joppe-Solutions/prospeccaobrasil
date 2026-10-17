// Dados reais para o relatório geomarketing:
// - IBGE agregado 6579: série de população estimada (município + UF) e projeção TGCA
// - IBGE Censo 2022 por bairro e município: services/censo2022.js (arquivo local)
// - OpenStreetMap: entorno da rua (services/entorno.js)
// - Nominatim/OSM: geocodificação do endereço + tiles para mapa real
// Cache em memória 24h (IBGE atualiza anualmente; Nominatim pede uso moderado).

const censo2022 = require('./censo2022');
const { entorno } = require('./entorno');
const { geocode } = require('./mapas');

const CACHE = new Map();
const TTL = 24 * 60 * 60 * 1000;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const IBGE = 'https://servicodados.ibge.gov.br/api/v3/agregados';
const UF_ID = { AC: 12, AL: 27, AP: 16, AM: 13, BA: 29, CE: 23, DF: 53, ES: 32, GO: 52, MA: 21, MT: 51, MS: 50, MG: 31, PA: 15, PB: 25, PR: 41, PE: 26, PI: 22, RJ: 33, RN: 24, RS: 43, RO: 11, RR: 14, SC: 42, SP: 35, SE: 28, TO: 17 };

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

// Grade de tiles OSM ao redor do ponto + posição do ponto e dos raios 1km/2km em pixels
function mapa(geo, { z = 15, cols = 3, rows = 3 } = {}) {
  if (!geo) return null;
  const n = 2 ** z, ts = 256;
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
    const [mun, geo] = await Promise.all([
      municipioId(imovel.cidade, uf).catch(() => null),
      geocode(imovel).catch(() => null),
    ]);
    const [serieMun, serieUF, entornoRua] = await Promise.all([
      mun ? seriePopulacao('N6', mun.id).catch(() => null) : null,
      seriePopulacao('N3', UF_ID[uf]).catch(() => null),
      // O serviço de mapas pode demorar: o relatório espera no máximo 12 s (a consulta segue e fica em cache)
      Promise.race([entorno(geo, imovel).catch(() => null), new Promise((resolve) => setTimeout(resolve, 12000, null))]),
    ]);
    return {
      municipio: serieMun ? { nome: serieMun.nome, ...projetar(serieMun) } : null,
      uf: serieUF ? { nome: serieUF.nome, ...projetar(serieUF) } : null,
      censo: mun ? {
        municipio: censo2022.municipio(mun.id),
        bairro: censo2022.bairro(mun.id, imovel.bairro),
        temBairros: censo2022.temBairros(mun.id),
      } : null,
      geo,
      mapa: mapa(geo),
      entorno: entornoRua,
      fonte: `Estimativas de população — IBGE (agregado 6579) · ${censo2022.FONTE}`,
    };
  } catch (e) {
    console.error('Demografia indisponível:', e.message);
    return null;
  }
}

module.exports = { demografia, geocode, mapa };
