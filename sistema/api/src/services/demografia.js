// Demografia via API pública do IBGE (servicodados.ibge.gov.br).
// Traz série de população estimada por município e UF; projeta anos futuros
// por TGCA (mesma premissa do modelo de referência). Sem chave, sem custo.
// Cache em memória: IBGE atualiza anualmente, cache de 24h é seguro.

const CACHE = new Map();
const TTL = 24 * 60 * 60 * 1000;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

async function fetchJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`IBGE ${r.status}`);
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

// Série de população estimada (agregado 6579, variável 9324) — inclui projeções oficiais
async function seriePopulacao(nivel, id) {
  const data = await cached(`pop:${nivel}:${id}`, () =>
    fetchJson(`https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-6/variaveis/9324?localidades=${nivel}%5B${id}%5D`));
  const serie = data?.[0]?.resultados?.[0]?.series?.[0];
  if (!serie) return null;
  const anos = Object.entries(serie.serie)
    .map(([ano, v]) => [Number(ano), Number(String(v).replace(/\D/g, ''))])
    .filter(([, v]) => Number.isFinite(v))
    .sort((a, b) => a[0] - b[0]);
  return { nome: serie.localidade.nome, anos: Object.fromEntries(anos) };
}

// TGCA entre o primeiro e o último ano da série; projeta +2 e +4 anos a partir do último
function projetar(serie) {
  const anos = Object.keys(serie.anos).map(Number).sort((a, b) => a - b);
  if (anos.length < 2) return { anos, serie: serie.anos, tgca: null };
  const base = anos[anos.length - 1];
  const first = anos[0];
  const tgca = Math.pow(serie.anos[base] / serie.anos[first], 1 / (base - first)) - 1;
  const proj = { ...serie.anos };
  proj[base + 2] = Math.round(serie.anos[base] * Math.pow(1 + tgca, 2));
  proj[base + 4] = Math.round(serie.anos[base] * Math.pow(1 + tgca, 4));
  return { anos: [base, base + 2, base + 4], serie: proj, tgca, anoBase: base };
}

// Retorna dados demográficos reais para o documento, ou null se indisponível
async function demografia(imovel) {
  try {
    if (!imovel.cidade || !imovel.uf) return null;
    const uf = String(imovel.uf).toUpperCase();
    const mun = await municipioId(imovel.cidade, uf);
    const [serieMun, serieUF] = await Promise.all([
      mun ? seriePopulacao('N6', mun.id) : null,
      seriePopulacao('N3', { AC: 12, AL: 27, AP: 16, AM: 13, BA: 29, CE: 23, DF: 53, ES: 32, GO: 52, MA: 21, MT: 51, MS: 50, MG: 31, PA: 15, PB: 25, PR: 41, PE: 26, PI: 22, RJ: 33, RN: 24, RS: 43, RO: 11, RR: 14, SC: 42, SP: 35, SE: 28, TO: 17 }[uf]),
    ]);
    return {
      municipio: serieMun ? { nome: serieMun.nome, ...projetar(serieMun) } : null,
      uf: serieUF ? { nome: serieUF.nome, ...projetar(serieUF) } : null,
      fonte: 'Estimativas de população — IBGE (agregado 6579)',
    };
  } catch (e) {
    console.error('Demografia IBGE indisponível:', e.message);
    return null;
  }
}

module.exports = { demografia };
