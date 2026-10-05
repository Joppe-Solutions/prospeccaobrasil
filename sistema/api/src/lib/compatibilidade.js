// Cruza um imóvel com as diretrizes (premissas) de uma demanda de expansão.
// Cada critério resulta em: atende | nao_atende | sem_dado (demanda exige, imóvel não informa).
// Critérios que a demanda não define ficam de fora da avaliação.

const DEMANDA_ATIVA = ['aberta', 'contratada', 'em_andamento'];
const IMOVEL_OFERTAVEL = ['disponivel', 'negociacao'];

const normalize = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const fmt = (v, unidade = '') => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${unidade}`;
const money = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function faixa(min, max, f) {
  if (min != null && max != null) return `${f(min)} a ${f(max)}`;
  return min != null ? `a partir de ${f(min)}` : `até ${f(max)}`;
}

function avaliarFaixa(chave, rotulo, valor, min, max, f) {
  if (min == null && max == null) return null;
  const exigido = faixa(min, max, f);
  if (valor == null) return { chave, rotulo, status: 'sem_dado', exigido, imovel: null };
  const ok = (min == null || valor >= min) && (max == null || valor <= max);
  return { chave, rotulo, status: ok ? 'atende' : 'nao_atende', exigido, imovel: f(valor) };
}

// tipo da demanda → tipo de imóvel que a atende
const NEGOCIO = { aquisicao: 'venda', passagem_ponto: 'passagem_ponto' };
const ROTULO_DEMANDA = { locacao: 'Locação', aquisicao: 'Aquisição', passagem_ponto: 'Passagem de ponto', implantacao: 'Implantação (locação)' };
const ROTULO_IMOVEL = { locacao: 'Locação', venda: 'Venda direta', passagem_ponto: 'Passagem de ponto' };

function avaliarNegocio(imovel, demanda) {
  const quer = NEGOCIO[demanda.tipo] || 'locacao';
  return {
    chave: 'negocio', rotulo: 'Tipo de negócio',
    status: imovel.tipo === quer ? 'atende' : 'nao_atende',
    exigido: ROTULO_DEMANDA[demanda.tipo] || demanda.tipo,
    imovel: ROTULO_IMOVEL[imovel.tipo] || imovel.tipo,
  };
}

// regioesInteresse é texto livre ("Zona Sul, Niterói; Barra"): basta um termo bater
// com bairro, cidade ou UF do imóvel.
function avaliarRegiao(imovel, demanda) {
  const termos = normalize(demanda.regioesInteresse).split(/[,;/\n]| e /).map((t) => t.trim()).filter((t) => t.length > 1);
  if (!termos.length) return null;
  const locais = [imovel.bairro, imovel.cidade, imovel.uf].map(normalize).filter(Boolean);
  // UF (2 letras) só casa por igualdade; nomes maiores aceitam "contém" nos dois sentidos
  const ok = termos.some((t) => locais.some((l) => l === t || (t.length > 2 && l.length > 2 && (l.includes(t) || t.includes(l)))));
  return {
    chave: 'regiao', rotulo: 'Região',
    status: ok ? 'atende' : 'nao_atende',
    exigido: demanda.regioesInteresse.trim(),
    imovel: [imovel.bairro, imovel.cidade].filter(Boolean).join(', '),
  };
}

function avaliar(imovel, demanda) {
  const venda = demanda.tipo === 'aquisicao';
  const m2 = (v) => fmt(v, ' m²');
  const m = (v) => fmt(v, ' m');
  const criterios = [
    avaliarNegocio(imovel, demanda),
    avaliarRegiao(imovel, demanda),
    avaliarFaixa('area', 'Área', num(imovel.areaTotal) ?? num(imovel.areaUtil), num(demanda.areaMinima), num(demanda.areaMaxima), m2),
    avaliarFaixa('frente', 'Frente', num(imovel.frenteImovel), num(demanda.frenteMinima), null, m),
    avaliarFaixa('peDireito', 'Pé-direito', num(imovel.peDireito), num(demanda.peDireitoMinimo), null, m),
    avaliarFaixa('vagas', 'Vagas', num(imovel.vagas), num(demanda.vagasMinimas), null, (v) => fmt(v)),
    venda
      ? avaliarFaixa('valor', 'Valor de compra', num(imovel.precoVenda), num(demanda.compraMinima), num(demanda.compraMaxima), money)
      : avaliarFaixa('valor', 'Aluguel', num(imovel.aluguel), num(demanda.aluguelMinimo), num(demanda.aluguelMaximo), money),
  ].filter(Boolean);

  const conta = (s) => criterios.filter((c) => c.status === s).length;
  const naoAtende = conta('nao_atende');
  // O tipo de negócio sempre é avaliado; sozinho não caracteriza compatibilidade.
  const atendeAlemDoNegocio = criterios.some((c) => c.chave !== 'negocio' && c.status === 'atende');
  let nivel = 'incompativel';
  if (naoAtende === 0 && atendeAlemDoNegocio) nivel = 'compativel';
  else if (naoAtende === 1 && conta('atende') >= 2) nivel = 'parcial';
  return { nivel, criterios, atende: conta('atende'), naoAtende, semDado: conta('sem_dado') };
}

module.exports = { avaliar, DEMANDA_ATIVA, IMOVEL_OFERTAVEL };
