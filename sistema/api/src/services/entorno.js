// Entorno do imóvel no nível da rua: estabelecimentos, transporte e a própria via, a partir do
// OpenStreetMap (Overpass API). É mapeamento colaborativo: as contagens são um piso, não um censo.
const fs = require('fs');
const path = require('path');

// Os servidores públicos do Overpass oscilam (504/500 em horários de pico). Por isso:
// vários servidores, duas rodadas, e o resultado fica em disco — um entorno já consultado
// continua disponível mesmo com o serviço fora do ar.
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const CACHE_DIR = process.env.ENTORNO_CACHE_DIR || path.join(__dirname, '..', '..', 'cache', 'entorno');
const TTL = 30 * 24 * 60 * 60 * 1000;
const RAIO = 1000;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// "Av. Cônego Vasconcelos" e "Avenida Cônego Vasconcelos" são a mesma via: compara sem o tipo de logradouro
const nucleo = (s) => norm(s).replace(/^(rua|r|avenida|av|travessa|tv|estrada|estr|rodovia|rod|praca|pca|alameda|al|largo|lgo|ladeira|beco|via)\s+/, '');
const mesmaVia = (a, b) => { const x = nucleo(a), y = nucleo(b); return Boolean(x && y) && (x === y || x.includes(y) || y.includes(x)); };

// [rótulo, { chave OSM: valores }]. A primeira categoria que casar fica com o elemento.
const CATEGORIAS = [
  ['Shoppings e lojas de departamento', { shop: ['mall', 'department_store'] }],
  ['Supermercados e conveniência', { shop: ['supermarket', 'convenience', 'greengrocer', 'butcher', 'wholesale'] }],
  ['Alimentação (restaurantes, bares, cafés)', { amenity: ['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'food_court', 'ice_cream'], shop: ['bakery', 'pastry', 'coffee'] }],
  ['Farmácias e saúde', { amenity: ['pharmacy', 'clinic', 'doctors', 'dentist', 'hospital'], shop: ['chemist', 'optician', 'medical_supply'] }],
  ['Bancos e serviços financeiros', { amenity: ['bank', 'bureau_de_change'], shop: ['lottery'] }],
  ['Moda, calçados e acessórios', { shop: ['clothes', 'shoes', 'bag', 'jewelry', 'boutique', 'fashion_accessories', 'watches'] }],
  ['Educação', { amenity: ['school', 'university', 'college', 'kindergarten', 'language_school'] }],
  ['Academias', { leisure: ['fitness_centre'] }],
  ['Hotéis', { tourism: ['hotel', 'hostel'] }],
  ['Estacionamentos', { amenity: ['parking'] }],
];
const OUTRAS_LOJAS = 'Outras lojas e serviços';
const TRANSPORTE = [
  ['Pontos de ônibus', (t) => t.highway === 'bus_stop'],
  ['Estações de metrô, trem ou VLT', (t) => ['station', 'tram_stop'].includes(t.railway)],
  ['Terminais de barcas', (t) => t.amenity === 'ferry_terminal'],
];
// Geradores de fluxo: o mais próximo de cada tipo entra na lista de destaques
const DESTAQUES = [
  ['Estação (metrô, trem ou VLT)', (t) => ['station', 'tram_stop'].includes(t.railway)],
  ['Shopping', (t) => t.shop === 'mall'],
  ['Supermercado', (t) => t.shop === 'supermarket'],
  ['Banco', (t) => t.amenity === 'bank'],
  ['Farmácia', (t) => t.amenity === 'pharmacy'],
  ['Hospital', (t) => t.amenity === 'hospital'],
  ['Universidade ou faculdade', (t) => ['university', 'college'].includes(t.amenity)],
];
const VIAS = {
  motorway: 'Via expressa', trunk: 'Via expressa', primary: 'Via arterial principal', secondary: 'Via arterial secundária',
  tertiary: 'Via coletora', residential: 'Via local', living_street: 'Via local compartilhada', pedestrian: 'Calçadão (pedestres)',
  unclassified: 'Via local', service: 'Via de serviço',
};

function categoria(t) {
  for (const [rotulo, regras] of CATEGORIAS) {
    if (Object.entries(regras).some(([k, valores]) => valores.includes(t[k]))) return rotulo;
  }
  return t.shop && !['vacant', 'no'].includes(t.shop) ? OUTRAS_LOJAS : null;
}

function distancia(a, b) {
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
}

async function consultar(geo) {
  const p = `(around:${RAIO},${geo.lat},${geo.lon})`;
  const query = `[out:json][timeout:25];(nwr${p}[amenity];nwr${p}[shop];nwr${p}[railway~"^(station|tram_stop)$"];nwr${p}[highway=bus_stop];nwr${p}[leisure=fitness_centre];nwr${p}[tourism~"^(hotel|hostel)$"];way(around:40,${geo.lat},${geo.lon})[highway][name];);out center tags;`;
  let erro;
  for (const url of [...ENDPOINTS, ...ENDPOINTS]) {
    try {
      const r = await fetch(url, {
        method: 'POST', signal: AbortSignal.timeout(20000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'prospeccao-brasil-inteligencia/1.0' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!r.ok) throw new Error(`Overpass ${r.status}`);
      // Guarda só o que o resumo usa
      return ((await r.json()).elements || []).map(({ type, lat, lon, center, tags }) => ({ type, lat, lon, center, tags }));
    } catch (e) { erro = e; }
  }
  throw erro;
}

function lerCache(arquivo) {
  try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return null; }
}

function resumir(elementos, geo, imovel) {
  const pontos = [];
  const vias = [];
  for (const e of elementos) {
    const t = e.tags || {};
    if (e.type === 'way' && t.highway && t.highway !== 'bus_stop' && t.name) vias.push(t);
    const pos = e.lat != null ? { lat: e.lat, lon: e.lon } : e.center;
    if (pos) pontos.push({ t, dist: distancia(geo, pos) });
  }
  pontos.sort((a, b) => a.dist - b.dist);

  const contar = (teste, raio) => pontos.filter((p) => p.dist <= raio && teste(p.t)).length;
  const linhas = [...CATEGORIAS.map(([r]) => r), OUTRAS_LOJAS]
    .map((rotulo) => ({ rotulo, r500: contar((t) => categoria(t) === rotulo, 500), r1000: contar((t) => categoria(t) === rotulo, RAIO) }));
  const transporte = TRANSPORTE.map(([rotulo, teste]) => ({ rotulo, r500: contar(teste, 500), r1000: contar(teste, RAIO) }));
  const destaques = DESTAQUES.map(([rotulo, teste]) => {
    const p = pontos.find((x) => teste(x.t) && x.t.name);
    return p ? { rotulo, nome: p.t.name, dist: Math.round(p.dist / 10) * 10 } : null;
  }).filter(Boolean);

  // Estabelecimentos na própria rua: endereço OSM na mesma via ou a até 60 m do ponto
  const naRua = pontos
    .filter((p) => p.t.name && categoria(p.t) && (p.dist <= 60 || mesmaVia(imovel.endereco, p.t['addr:street'])))
    .slice(0, 14)
    .map((p) => ({ nome: p.t.name, categoria: categoria(p.t), dist: Math.round(p.dist / 10) * 10 }));

  // Só descreve a via se for a do cadastro; outra rua próxima seria informação errada
  const via = vias.find((v) => mesmaVia(imovel.endereco, v.name));
  const total = (campo) => linhas.reduce((n, l) => n + l[campo], 0);
  return {
    linhas, transporte, destaques, naRua,
    total500: total('r500'), total1000: total('r1000'),
    via: via ? {
      nome: via.name, tipo: VIAS[via.highway] || 'Via urbana',
      faixas: via.lanes || null, maoUnica: via.oneway === 'yes' ? 'Mão única' : via.oneway === 'no' ? 'Mão dupla' : null,
      velocidade: via.maxspeed ? `${via.maxspeed} km/h` : null,
    } : null,
  };
}

async function entorno(geo, imovel) {
  // Nos testes automatizados não há chamada externa
  if (!geo || process.env.NODE_ENV === 'test') return null;
  const arquivo = path.join(CACHE_DIR, `${geo.lat.toFixed(4)}_${geo.lon.toFixed(4)}.json`);
  const salvo = lerCache(arquivo);
  if (salvo && Date.now() - salvo.t < TTL) return { ...resumir(salvo.elementos, geo, imovel), consultadoEm: salvo.t };
  try {
    const elementos = await consultar(geo);
    const t = Date.now();
    try { fs.mkdirSync(CACHE_DIR, { recursive: true }); fs.writeFileSync(arquivo, JSON.stringify({ t, elementos })); } catch (e) { console.error('Cache de entorno:', e.message); }
    return { ...resumir(elementos, geo, imovel), consultadoEm: t };
  } catch (e) {
    console.error('Entorno (OSM) indisponível:', e.message);
    // Serviço fora do ar: vale a última consulta guardada, mesmo antiga
    return salvo ? { ...resumir(salvo.elementos, geo, imovel), consultadoEm: salvo.t } : null;
  }
}

module.exports = { entorno, resumir, FONTE: 'OpenStreetMap (Overpass API) — mapeamento colaborativo' };
