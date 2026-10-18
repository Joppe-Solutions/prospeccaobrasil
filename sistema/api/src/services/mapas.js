// Localização do imóvel: coordenadas e imagem do mapa.
//  1. Coordenadas cadastradas no imóvel (copiadas do Google Maps): exatas, sempre vencem.
//  2. Com GOOGLE_MAPS_API_KEY no .env: Google Geocoding (nível do número) + Google Static Maps,
//     o mesmo mapa que a equipe confere no Google. Resultados ficam em cache em disco.
//  3. Sem chave: Nominatim (OpenStreetMap), que muitas vezes só acha o meio da rua — por isso
//     o resultado vem marcado como aproximado e o documento avisa.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = () => process.env.MAPAS_CACHE_DIR || path.join(__dirname, '..', '..', 'cache', 'mapas');
const TTL = 90 * 24 * 60 * 60 * 1000;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const chaveGoogle = () => process.env.GOOGLE_MAPS_API_KEY || '';
const usaGoogle = () => Boolean(chaveGoogle());

function lerCache(arquivo, { binario = false } = {}) {
  try {
    if (Date.now() - fs.statSync(arquivo).mtimeMs > TTL) return null;
    return binario ? fs.readFileSync(arquivo) : JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  } catch { return null; }
}
function gravarCache(arquivo, conteudo) {
  try { fs.mkdirSync(path.dirname(arquivo), { recursive: true }); fs.writeFileSync(arquivo, conteudo); } catch (e) { console.error('Cache de mapas:', e.message); }
}
const hash = (texto) => crypto.createHash('sha1').update(texto).digest('hex').slice(0, 24);

async function buscarJson(url, ua) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: ua ? { 'User-Agent': ua } : {} });
  if (!r.ok) throw new Error(`${r.status} ${url.replace(/key=[^&]+/, 'key=***').slice(0, 90)}`);
  return r.json();
}

const enderecoDe = (i) => [
  i.endereco && `${i.endereco}${i.numero ? `, ${i.numero}` : ''}`, i.bairro, i.cidade, i.uf, i.cep, 'Brasil',
].filter(Boolean).join(', ');

// Coordenadas válidas no cadastro (Number(null) é 0: ausência não pode virar o ponto 0,0)
function coordenadasCadastradas(i) {
  if (i.latitude == null || i.longitude == null || i.latitude === '' || i.longitude === '') return null;
  const lat = Number(i.latitude), lon = Number(i.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

// Google Geocoding. location_type: ROOFTOP e RANGE_INTERPOLATED chegam ao número; o resto é rua/bairro.
async function geocodeGoogle(imovel) {
  const consulta = enderecoDe(imovel);
  const arquivo = path.join(CACHE_DIR(), 'geo', `${hash(norm(consulta))}.json`);
  const salvo = lerCache(arquivo);
  if (salvo) return salvo;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(consulta)}&components=country:BR&language=pt-BR&region=br&key=${encodeURIComponent(chaveGoogle())}`;
  const r = await buscarJson(url);
  if (r.status === 'ZERO_RESULTS') return null;
  if (r.status !== 'OK') throw new Error(`Google Geocoding: ${r.status}${r.error_message ? ` — ${r.error_message}` : ''}`);
  const g = r.results[0];
  const tipo = g.geometry.location_type;
  const geo = {
    lat: g.geometry.location.lat, lon: g.geometry.location.lng, fonte: 'Google Maps',
    precisao: tipo === 'ROOFTOP' || tipo === 'RANGE_INTERPOLATED' ? 'endereco' : 'rua',
  };
  gravarCache(arquivo, JSON.stringify(geo));
  return geo;
}

// Ruas homônimas são comuns: só vale resultado na cidade do cadastro e, havendo bairro, no bairro.
function escolherResultado(resultados, imovel) {
  const campos = (r, chaves) => chaves.map((k) => norm(r.address?.[k] || '')).filter(Boolean);
  const naCidade = resultados.filter((r) => campos(r, ['city', 'town', 'municipality', 'village']).includes(norm(imovel.cidade)));
  if (!imovel.bairro) return naCidade[0] || null;
  const bairro = norm(imovel.bairro);
  const noBairro = naCidade.find((r) => campos(r, ['suburb', 'neighbourhood', 'city_district', 'quarter', 'borough'])
    .some((b) => b === bairro || b.includes(bairro) || bairro.includes(b)));
  return noBairro || (naCidade.length === 1 ? naCidade[0] : null);
}

// Endereços digitados com abreviação ("Av. Min. Edgard Romero") não existem assim no OpenStreetMap.
const ABREVIACOES = {
  av: 'Avenida', 'r': 'Rua', 'pça': 'Praça', 'pca': 'Praça', tv: 'Travessa', trav: 'Travessa', estr: 'Estrada', rod: 'Rodovia',
  al: 'Alameda', lgo: 'Largo', lad: 'Ladeira', min: 'Ministro', dr: 'Doutor', dra: 'Doutora', prof: 'Professor', profa: 'Professora',
  cel: 'Coronel', gen: 'General', mal: 'Marechal', eng: 'Engenheiro', pres: 'Presidente', vis: 'Visconde', alm: 'Almirante',
  cap: 'Capitão', dep: 'Deputado', ver: 'Vereador', sen: 'Senador', des: 'Desembargador', pe: 'Padre', fr: 'Frei', sta: 'Santa', sto: 'Santo',
  cons: 'Conselheiro', cmte: 'Comandante', ten: 'Tenente', sgt: 'Sargento', brig: 'Brigadeiro', bar: 'Barão',
};
// Só expande com ponto ("Min.") ou, para tipo de logradouro, quando é a primeira palavra ("Av ...")
function expandirAbreviacoes(texto) {
  return String(texto || '').split(/\s+/).map((palavra, n) => {
    const m = /^([A-Za-zÀ-ú]+)(\.?)([,;]?)$/.exec(palavra);
    if (!m) return palavra;
    const chave = norm(m[1]);
    const tipoLogradouro = ['av', 'r', 'pça', 'pca', 'tv', 'trav', 'estr', 'rod', 'al', 'lgo', 'lad'].includes(chave);
    return ABREVIACOES[chave] && (m[2] || (tipoLogradouro && n === 0)) ? `${ABREVIACOES[chave]}${m[3]}` : palavra;
  }).join(' ');
}

const SEM_RESULTADO_TTL = 24 * 60 * 60 * 1000;

async function geocodeNominatim(imovel) {
  if (!imovel.cidade) return null;
  const consulta = [imovel.endereco && `${imovel.endereco}${imovel.numero ? `, ${imovel.numero}` : ''}`, imovel.bairro, imovel.cidade, imovel.uf, 'Brasil'].filter(Boolean).join(', ');
  const arquivo = path.join(CACHE_DIR(), 'geo', `osm-${hash(norm(consulta))}.json`);
  const salvo = lerCache(arquivo);
  if (salvo?.semResultado) { if (Date.now() - salvo.t < SEM_RESULTADO_TTL) return null; }
  else if (salvo) return salvo;

  // Tentativas, da mais fiel à mais genérica; o Nominatim pede no máximo 1 consulta por segundo
  const expandido = (imovel.endereco ? { ...imovel, endereco: expandirAbreviacoes(imovel.endereco) } : imovel);
  const montar = (i, comNumero) => [i.endereco && `${i.endereco}${comNumero && i.numero ? `, ${i.numero}` : ''}`, i.bairro, i.cidade, i.uf, 'Brasil'].filter(Boolean).join(', ');
  const tentativas = [[consulta, false]];
  // Busca estruturada (número + logradouro): o Nominatim acerta o número com mais frequência assim
  if (imovel.numero && imovel.endereco) {
    const estruturada = new URLSearchParams({ street: `${imovel.numero} ${expandido.endereco}`, city: imovel.cidade, ...(imovel.uf ? { state: imovel.uf } : {}), country: 'Brasil' });
    tentativas.unshift([estruturada, false]);
  }
  if (montar(expandido, true) !== consulta) tentativas.push([montar(expandido, true), false]);
  if (imovel.numero) tentativas.push([montar(expandido, false), true]); // sem o número: resultado é só a rua
  for (const [n, [q, soRua]] of tentativas.entries()) {
    if (n) await new Promise((resolve) => setTimeout(resolve, 1100));
    const filtro = q instanceof URLSearchParams ? q.toString() : `q=${encodeURIComponent(q)}`;
    const r = await buscarJson(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=10&countrycodes=br&${filtro}`, 'prospeccao-brasil-inteligencia/1.0');
    const g = escolherResultado(r || [], imovel);
    if (!g) continue;
    // Resultado de via (sem número no OSM) é o meio da rua: aproximado
    const noNumero = !soRua && (Boolean(g.address?.house_number) || ['house', 'building', 'apartments', 'yes'].includes(g.type));
    const geo = { lat: Number(g.lat), lon: Number(g.lon), fonte: 'OpenStreetMap', precisao: noNumero ? 'endereco' : 'rua' };
    gravarCache(arquivo, JSON.stringify(geo));
    return geo;
  }
  gravarCache(arquivo, JSON.stringify({ semResultado: true, t: Date.now() }));
  return null;
}

/** { lat, lon, fonte, precisao: 'exata' | 'endereco' | 'rua' } ou null */
async function geocode(imovel) {
  const cad = coordenadasCadastradas(imovel);
  if (cad) return { ...cad, fonte: 'cadastro', precisao: 'exata' };
  if (!imovel.cidade) return null;
  try {
    if (usaGoogle()) {
      const g = await geocodeGoogle(imovel);
      if (g) return g;
    }
  } catch (e) { console.error('Geocodificação Google falhou, usando OpenStreetMap:', e.message); }
  try { return await geocodeNominatim(imovel); } catch { return null; }
}

// Imagem do mapa com marcador (Google Static Maps), guardada em disco: cada imóvel custa uma
// única chamada. Devolve Buffer PNG ou null (sem chave, falha ou limite da conta).
async function mapaEstatico(geo, { largura = 640, altura = 490, zoom } = {}) {
  if (!usaGoogle() || !geo) return null;
  const z = zoom || (geo.precisao === 'rua' ? 16 : 17);
  const ponto = `${geo.lat.toFixed(6)},${geo.lon.toFixed(6)}`;
  const arquivo = path.join(CACHE_DIR(), 'img', `${hash(`${ponto}|${z}|${largura}x${altura}`)}.png`);
  const salvo = lerCache(arquivo, { binario: true });
  if (salvo) return salvo;
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${ponto}&zoom=${z}&size=${largura}x${altura}&scale=2&maptype=roadmap&language=pt-BR&region=br&markers=${encodeURIComponent(`color:0x153c34|size:mid|${ponto}`)}&key=${encodeURIComponent(chaveGoogle())}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok || !String(r.headers.get('content-type') || '').startsWith('image/')) throw new Error(`Static Maps ${r.status}`);
    const imagem = Buffer.from(await r.arrayBuffer());
    gravarCache(arquivo, imagem);
    return imagem;
  } catch (e) { console.error('Mapa estático (Google) indisponível:', e.message); return null; }
}

module.exports = { geocode, mapaEstatico, usaGoogle, coordenadasCadastradas, escolherResultado, expandirAbreviacoes };
