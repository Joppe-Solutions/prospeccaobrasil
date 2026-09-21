// Triagem interna de ponto comercial — heurística baseada APENAS nos dados cadastrados.
// Não consulta fontes de mercado: não afirma médias regionais, fluxo ou poder de compra.
// Se OPENAI_API_KEY estiver definida, enriquece com IA externa (payload mínimo de atributos).

const fmt = (v) => v == null ? null : Number(v);
const money = (v) => v == null ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

function custoTotal(i) {
  return [i.aluguel, i.condominio, i.iptu].map(Number).filter(Boolean).reduce((a, b) => a + b, 0) || null;
}

const ROTULO = 'Triagem heurística baseada nos dados cadastrados — não é estudo de mercado. ' +
  'Comparativos de região, fluxo e poder de compra exigem fonte externa validada.';

function gerarAnaliseInterna(imovel) {
  const area = fmt(imovel.areaTotal) || fmt(imovel.areaUtil);
  const custo = custoTotal(imovel);
  const custoM2 = area && custo ? custo / area : null;
  const frente = fmt(imovel.frenteImovel);
  const pd = fmt(imovel.peDireito);

  let score = 50;
  const fortes = [], atencao = [];
  const faltando = [];
  if (!area) faltando.push('área');
  if (!custo) faltando.push('custos (aluguel/condomínio/IPTU)');
  if (!frente) faltando.push('frente de loja');
  if (!pd) faltando.push('pé direito');
  if (!imovel.bairro) faltando.push('bairro');

  // Apenas observações derivadas dos dados cadastrados — sem comparativo de mercado
  if (frente >= 8) { score += 8; fortes.push(`Frente de ${frente} m registrada no cadastro.`); }
  else if (frente >= 5) { score += 4; fortes.push(`Frente de ${frente} m registrada no cadastro.`); }
  else if (frente) { atencao.push(`Frente de ${frente} m — avaliar comunicação visual.`); }

  if (pd >= 3.5) { score += 4; fortes.push(`Pé direito de ${pd} m permite mezanino.`); }
  else if (pd && pd < 2.8) { atencao.push(`Pé direito de ${pd} m limita layout e estoque vertical.`); }

  if (imovel.jirau) { score += 3; fortes.push(`Jirau de ${imovel.jirau} m² amplia área útil.`); }

  if (custoM2) {
    fortes.push(`Custo cadastrado de ${money(custoM2)}/m² (aluguel + condomínio + IPTU).`);
  }

  if (imovel.periodoContrato) {
    fortes.push(`Prazo contratual informado: ${imovel.periodoContrato}.`);
  }

  score = Math.max(20, Math.min(90, score));
  if (faltando.length) {
    score = Math.min(score, 60);
    atencao.push(`Dados insuficientes para triagem completa: faltam ${faltando.join(', ')}.`);
  }
  if (!fortes.length) fortes.push('Cadastro sem atributos suficientes para destacar pontos fortes.');
  if (!atencao.length) atencao.push('Nenhum ponto crítico nos dados cadastrados — isso não substitui análise de mercado.');

  const segmentos = [];
  if (area && area >= 100 && area <= 400) segmentos.push('Varejo de médio porte', 'Serviços', 'Alimentação');
  if (area && area < 100) segmentos.push('Serviços e conveniência', 'Varejo compacto');
  if (area && area > 400) segmentos.push('Varejo de grande formato', 'Showrooms');
  if (!segmentos.length) segmentos.push('A definir após completar o cadastro');

  return {
    score,
    resumo: `${ROTULO} Ponto em ${imovel.bairro || imovel.cidade || 'local a confirmar'} com ${area ? area + ' m²' : 'área a confirmar'} e custo cadastrado de ${money(custo)}.`,
    conteudo: {
      tipo: 'triagem_heuristica',
      aviso: ROTULO,
      dadosInsuficientes: faltando,
      pontosFortes: fortes,
      pontosAtencao: atencao,
      segmentosRecomendados: segmentos,
      indicadores: {
        custoM2: custoM2 ? Math.round(custoM2) : null,
        custoTotal: custo,
        areaTotal: area,
        frente, peDireito: pd,
      },
      recomendacao: faltando.length
        ? 'Completar o cadastro antes de qualquer priorização.'
        : score >= 70 ? 'Cadastro completo — próximo passo: visita e levantamento de dados de mercado com fontes.' :
          'Revisar pontos de atenção antes de avançar.',
    },
  };
}

// Payload mínimo para provedor externo — somente atributos físicos/comerciais do ponto.
function payloadMinimo(imovel) {
  return {
    tipo: imovel.tipo, categoria: imovel.categoria,
    bairro: imovel.bairro, cidade: imovel.cidade, uf: imovel.uf,
    areaTotal: fmt(imovel.areaTotal), areaUtil: fmt(imovel.areaUtil),
    frenteImovel: fmt(imovel.frenteImovel), peDireito: fmt(imovel.peDireito),
    jirau: fmt(imovel.jirau), mezanino: fmt(imovel.mezanino),
    custoMensal: custoTotal(imovel),
  };
}

async function gerarAnalise(imovel) {
  const base = gerarAnaliseInterna(imovel);
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ...base, modelo: 'triagem-interna' };
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um analista de expansão varejista. Responda em português, tom executivo, com 1 parágrafo de resumo e listas curtas de pontos fortes, atenção e segmentos. Deixe claro quando faltam dados; não invente dados de mercado. Retorne JSON com campos resumo, pontosFortes[], pontosAtencao[], segmentosRecomendados[], recomendacao.' },
          { role: 'user', content: `Triagem deste ponto comercial: ${JSON.stringify(payloadMinimo(imovel))}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content;
    if (!txt) throw new Error('sem resposta');
    const parsed = JSON.parse(txt);
    return {
      score: base.score,
      resumo: parsed.resumo || base.resumo,
      conteudo: { ...base.conteudo, ...parsed, tipo: 'triagem_heuristica', aviso: ROTULO, dadosInsuficientes: base.conteudo.dadosInsuficientes },
      modelo: j.model || 'openai',
    };
  } catch (e) {
    console.error('IA externa falhou, usando triagem interna:', e.message);
    return { ...base, modelo: 'triagem-interna' };
  }
}

module.exports = { gerarAnalise, custoTotal };
