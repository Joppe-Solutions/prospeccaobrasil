// Bairros de interesse do cliente: guardados em texto ("Méier; Tijuca; Centro") para manter
// compatíveis os cadastros antigos, que separavam por vírgula ou quebra de linha.
export const listaBairros = (texto) => String(texto || '').split(/[;,\n]/).map(s => s.trim()).filter(Boolean);
export const juntarBairros = (lista) => lista.map(s => s.trim()).filter(Boolean).join('; ');

const norm = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const bate = (a, b) => a === b || (a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a)));

// Texto do aviso ao salvar o imóvel; sem cliente que combine, não há aviso.
export function avisoClientes({ compativeis = 0, parciais = 0 } = {}) {
  const c = `${compativeis} ${compativeis === 1 ? 'cliente compatível' : 'clientes compatíveis'}`;
  const p = compativeis ? `${parciais} ${parciais === 1 ? 'parcial' : 'parciais'}` : `${parciais} ${parciais === 1 ? 'cliente parcial' : 'clientes parciais'}`;
  if (!compativeis && !parciais) return null;
  return `Imóvel salvo: ${[compativeis && c, parciais && p].filter(Boolean).join(' e ')} para este ponto.`;
}

// Cruza as premissas do cliente (bairros e faixa de área) com o imóvel.
// compativel: bairro bate e a área não fica fora da faixa; parcial: só um dos dois; fora: nenhum.
export function premissasDoCliente(cliente, imovel) {
  const bairros = listaBairros(cliente.regioesInteresse).map(norm);
  const locais = [imovel.bairro, imovel.cidade].map(norm).filter(Boolean);
  const bairro = bairros.length ? bairros.some(b => locais.some(l => bate(b, l))) : null;
  const area = Number(imovel.areaTotal) || Number(imovel.areaUtil) || null;
  const min = cliente.areaMinima != null ? Number(cliente.areaMinima) : null;
  const max = cliente.areaMaxima != null ? Number(cliente.areaMaxima) : null;
  const temFaixa = min != null || max != null;
  const areaOk = !temFaixa || area == null ? null : (min == null || area >= min) && (max == null || area <= max);
  const nivel = bairro && areaOk !== false ? 'compativel'
    : bairro || areaOk ? 'parcial'
    : bairro === null && areaOk === null ? 'sem_premissas' : 'fora';
  return { nivel, bairro, area: areaOk };
}
