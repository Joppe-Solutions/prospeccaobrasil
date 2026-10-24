// Dados reais para o relatório geomarketing:
// - IBGE agregado 6579: série de população estimada (município + UF) e projeção TGCA
// - IBGE Censo 2022 por bairro e município: services/censo2022.js (arquivo local)
// - OpenStreetMap: entorno da rua (services/entorno.js)
// - Nominatim/OSM: geocodificação do endereço + tiles para mapa real
// Cache em memória 24h (IBGE atualiza anualmente; Nominatim pede uso moderado).

const censo2022 = require('./censo2022');
const setores = require('./setores');
const { entorno } = require('./entorno');
const { geocode, mapaEstatico, usaGoogle } = require('./mapas');

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

// Com a chave do Google: imagem estática centrada no ponto (512 px em escala 2 no zoom 14 = 1024 px no zoom 15),
// embutida no documento (a chave nunca vai para a página). O anel de 1 km é desenhado por cima, como nos tiles.
async function mapaGoogle(geo) {
  if (!geo || !usaGoogle()) return null;
  const imagem = await Promise.race([mapaEstatico(geo, { largura: 512, altura: 512, zoom: 14, marcador: false }), new Promise((r) => setTimeout(r, 8000, null))]).catch(() => null);
  if (!imagem) return null;
  const base = mapa(geo, { z: 15, cols: 4, rows: 4 });
  return { ...base, tiles: [], google: `data:image/png;base64,${imagem.toString('base64')}`, px: base.w / 2, py: base.h / 2 };
}

async function demografia(imovel) {
  try {
    if (!imovel.cidade || !imovel.uf) return null;
    const uf = String(imovel.uf).toUpperCase();
    const [mun, geo] = await Promise.all([
      // Código do município: tabela local do Censo (sem rede); a consulta ao IBGE só entra se o nome não bater
      Promise.resolve(censo2022.codigoMunicipio(imovel.cidade, uf)).then((codigo) => (codigo ? { id: codigo } : municipioId(imovel.cidade, uf))).catch(() => null),
      geocode(imovel).catch(() => null),
    ]);
    const [serieMun, serieUF, entornoRua] = await Promise.all([
      mun ? seriePopulacao('N6', mun.id).catch(() => null) : null,
      seriePopulacao('N3', UF_ID[uf]).catch(() => null),
      // O Overpass público tem levado ~30 s: o relatório espera até 40 s (a consulta segue e fica em cache).
      // Ao gerar a análise a consulta já começa em segundo plano, então em geral o resultado chega antes.
      Promise.race([entorno(geo, imovel).catch(() => null), new Promise((resolve) => setTimeout(resolve, 40000, null))]),
    ]);
    return {
      municipio: serieMun ? { nome: serieMun.nome, ...projetar(serieMun) } : null,
      uf: serieUF ? { nome: serieUF.nome, ...projetar(serieUF) } : null,
      censo: mun ? {
        municipio: censo2022.municipio(mun.id),
        bairro: censo2022.bairro(mun.id, imovel.bairro),
        raio: geo ? setores.raio(geo.lat, geo.lon, 1000) : null,
        temBairros: censo2022.temBairros(mun.id),
      } : null,
      geo,
      mapa: await mapaGoogle(geo) || mapa(geo, { z: 15, cols: 4, rows: 4 }), // zoom 15: o raio de 1 km ocupa o mapa
      entorno: entornoRua,
      fonte: `Estimativas de população — IBGE (agregado 6579) · ${censo2022.FONTE}`,
    };
  } catch (e) {
    console.error('Demografia indisponível:', e.message);
    return null;
  }
}

module.exports = { demografia, geocode, mapa };
