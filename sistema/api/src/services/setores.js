// Perfil dos moradores num raio em torno do ponto, a partir dos setores censitários do Censo 2022
// (arquivo gerado por scripts/build-censo2022-setores.py; hoje cobre o estado do RJ).
// Cada setor é tratado como um círculo com a sua área, centrado no centroide: entra na soma com a fração
// desse círculo que cai dentro do raio. Setores pequenos (áreas urbanas) ficam bem representados assim.
const path = require('path');
const { somarClasses } = require('./classes');

const FAIXAS = 11;
const CELULA = 0.02; // graus (~2 km): índice espacial simples
let indice;

function carregar() {
  if (indice !== undefined) return indice;
  try {
    const { setores } = require(path.join(__dirname, '..', 'data', 'censo2022-setores-rj.json'));
    indice = new Map();
    for (const s of setores) {
      const k = `${Math.floor(s[0] / CELULA)}:${Math.floor(s[1] / CELULA)}`;
      if (!indice.has(k)) indice.set(k, []);
      indice.get(k).push(s);
    }
  } catch { indice = null; }
  return indice;
}

const distancia = (lat1, lon1, lat2, lon2) => {
  const r = Math.PI / 180;
  const x = (lon2 - lon1) * r * Math.cos(((lat1 + lat2) / 2) * r), y = (lat2 - lat1) * r;
  return Math.sqrt(x * x + y * y) * 6371000;
};

// Fração da área do círculo r (setor), a distância d do centro, que fica dentro do círculo R (raio de busca)
function fracaoDentro(d, r, R) {
  if (r <= 0) return d <= R ? 1 : 0;
  if (d + r <= R) return 1;
  if (d >= R + r) return 0;
  if (d + R <= r) return (R * R) / (r * r);
  const a1 = r * r * Math.acos((d * d + r * r - R * R) / (2 * d * r));
  const a2 = R * R * Math.acos((d * d + R * R - r * r) / (2 * d * R));
  const a3 = 0.5 * Math.sqrt((-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R));
  return (a1 + a2 - a3) / (Math.PI * r * r);
}

/** Registro no formato de censo2022.registro (com nome "Raio de N m") ou null fora da cobertura */
function raio(lat, lon, metros = 1000) {
  const idx = carregar();
  if (!idx || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const ci = Math.floor(lat / CELULA), cj = Math.floor(lon / CELULA);
  const soma = { areaKm2: 0, populacao: 0, domicilios: 0, domiciliosOcupados: 0, domiciliosVagos: 0, homens: 0, mulheres: 0, responsaveis: 0, massaRenda: 0 };
  const faixas = Array(FAIXAS).fill(0), homensFaixas = Array(FAIXAS).fill(0);
  const paraClasses = [], medianas = [];
  let setores = 0;
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const s of idx.get(`${i}:${j}`) || []) {
    const [slat, slon, area, pop, dom, domOc, vagos, homens, mulheres] = s;
    const f = fracaoDentro(distancia(lat, lon, slat, slon), Math.sqrt((area * 1e6) / Math.PI), metros);
    if (f <= 0) continue;
    setores += 1;
    const resto = s.slice(9);
    const [resp, rMedia, rMediana] = resto.slice(FAIXAS, FAIXAS + 3);
    soma.areaKm2 += area * f; soma.populacao += pop * f; soma.domicilios += (dom || 0) * f; soma.domiciliosOcupados += (domOc || 0) * f;
    soma.domiciliosVagos += (vagos || 0) * f; soma.homens += (homens || 0) * f; soma.mulheres += (mulheres || 0) * f;
    resto.slice(0, FAIXAS).forEach((v, n) => { faixas[n] += (v || 0) * f; });
    resto.slice(FAIXAS + 3).forEach((v, n) => { homensFaixas[n] += (v || 0) * f; });
    if (resp && rMedia != null) { soma.responsaveis += resp * f; soma.massaRenda += rMedia * resp * f; }
    if (rMediana != null && resp) medianas.push([rMediana, resp * f]);
    if (domOc && rMedia != null && rMediana != null) paraClasses.push({ rendaMedia: rMedia, rendaMediana: rMediana, domiciliosOcupados: domOc * f });
  }
  if (!setores || soma.populacao < 1) return null;
  const inteiro = (v) => Math.round(v);
  // mediana ponderada das medianas dos setores (aproximação: o IBGE não divulga a distribuição)
  medianas.sort((a, b) => a[0] - b[0]);
  const metade = medianas.reduce((n, [, p]) => n + p, 0) / 2;
  let acumulado = 0, rendaMediana = null;
  for (const [v, p] of medianas) { acumulado += p; if (acumulado >= metade) { rendaMediana = v; break; } }
  const hf = homensFaixas.map(inteiro);
  return {
    nome: `Raio de ${metros} m`, raio: metros, setores,
    areaKm2: Math.round(soma.areaKm2 * 100) / 100,
    populacao: inteiro(soma.populacao), domicilios: inteiro(soma.domicilios), domiciliosOcupados: inteiro(soma.domiciliosOcupados),
    domiciliosVagos: inteiro(soma.domiciliosVagos), usoOcasional: null,
    moradoresPorDomicilio: soma.domiciliosOcupados ? Math.round((soma.populacao / soma.domiciliosOcupados) * 100) / 100 : null,
    homens: inteiro(soma.homens), mulheres: inteiro(soma.mulheres),
    faixas: faixas.map(inteiro), homensFaixas: hf, mulheresFaixas: faixas.map((v, n) => inteiro(v) - hf[n]),
    responsaveis: inteiro(soma.responsaveis),
    rendaMedia: soma.responsaveis ? Math.round((soma.massaRenda / soma.responsaveis) * 100) / 100 : null,
    rendaMediana,
    densidade: soma.areaKm2 ? soma.populacao / soma.areaKm2 : null,
    classes: somarClasses(paraClasses),
  };
}

module.exports = { raio, fracaoDentro, FONTE: 'IBGE — Censo Demográfico 2022, Agregados por setores censitários' };
