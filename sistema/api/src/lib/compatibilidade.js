// Cruza as premissas do cliente (bairros de interesse e faixa de área) com o imóvel. Mesma regra de
// `premissasDoCliente` em frontend/src/lib/bairros.js; "Méier; Tijuca" aceita vírgula e quebra de linha.
const norm = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const bate = (a, b) => a === b || (a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a)));
const listaBairros = (texto) => String(texto || '').split(/[;,\n]/).map((s) => s.trim()).filter(Boolean);

// Compatível exige bairro e área; parcial exige bairro e área não verificável.
function premissasDoCliente(cliente, imovel) {
  const bairros = listaBairros(cliente.regioesInteresse).map(norm);
  const locais = [imovel.bairro, imovel.cidade].map(norm).filter(Boolean);
  const bairro = bairros.length ? bairros.some((b) => locais.some((l) => bate(b, l))) : null;
  const area = Number(imovel.areaTotal) || Number(imovel.areaUtil) || null;
  const min = cliente.areaMinima != null ? Number(cliente.areaMinima) : null;
  const max = cliente.areaMaxima != null ? Number(cliente.areaMaxima) : null;
  const temFaixa = min != null || max != null;
  const areaOk = !temFaixa || area == null ? null : (min == null || area >= min) && (max == null || area <= max);
  const nivel = bairro === true && areaOk === true ? 'compativel'
    : bairro === true && areaOk === null ? 'parcial'
    : bairro === null && areaOk === null ? 'sem_premissas' : 'fora';
  const motivo = nivel === 'parcial' ? (!temFaixa ? 'Área de interesse não cadastrada' : 'Área do imóvel não informada') : null;
  return { nivel, bairro, area: areaOk, motivo };
}

module.exports = { premissasDoCliente };
