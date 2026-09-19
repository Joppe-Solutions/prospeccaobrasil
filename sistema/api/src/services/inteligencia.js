// Motor de inteligência de mercado — gera análise estruturada do ponto comercial.
// Se OPENAI_API_KEY estiver definida, enriquece com IA generativa; senão usa motor interno.

const fmt = (v) => v == null ? null : Number(v);
const money = (v) => v == null ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

function custoTotal(i) {
  return [i.aluguel, i.condominio, i.iptu].map(Number).filter(Boolean).reduce((a, b) => a + b, 0) || null;
}

function gerarAnaliseInterna(imovel) {
  const area = fmt(imovel.areaTotal) || fmt(imovel.areaUtil);
  const custo = custoTotal(imovel);
  const custoM2 = area && custo ? custo / area : null;
  const frente = fmt(imovel.frenteImovel);
  const pd = fmt(imovel.peDireito);

  let score = 60;
  const fortes = [], atencao = [];

  if (frente >= 8) { score += 10; fortes.push(`Frente ampla de ${frente} m — excelente visibilidade e vitrine.`); }
  else if (frente >= 5) { score += 6; fortes.push(`Boa frente de ${frente} m, adequada para exposição de marca.`); }
  else if (frente) { atencao.push(`Frente de ${frente} m é estreita — avaliar comunicação visual.`); score -= 4; }

  if (pd >= 3.5) { score += 6; fortes.push(`Pé direito de ${pd} m permite operação confortável e mezanino.`); }
  else if (pd && pd < 2.8) { atencao.push(`Pé direito de ${pd} m limita layout e estoque vertical.`); score -= 3; }

  if (imovel.jirau) { score += 4; fortes.push(`Jirau de ${imovel.jirau} m² amplia área útil sem custo proporcional.`); }

  if (custoM2) {
    if (custoM2 < 80) { score += 10; fortes.push(`Custo de ${money(custoM2)}/m² competitivo para a região.`); }
    else if (custoM2 <= 160) { score += 4; fortes.push(`Custo de ${money(custoM2)}/m² dentro da faixa praticada.`); }
    else { atencao.push(`Custo de ${money(custoM2)}/m² acima da média — negociar carência/luvas.`); score -= 6; }
  }

  const bairrosFortes = ['ipanema', 'leblon', 'copacabana', 'barra', 'tijuca', 'botafogo', 'centro'];
  if (bairrosFortes.some(b => (imovel.bairro || '').toLowerCase().includes(b))) {
    score += 8; fortes.push(`Localização em ${imovel.bairro} — bairro de alto fluxo e poder de compra.`);
  }

  if (imovel.periodoContrato) {
    const anos = parseInt(imovel.periodoContrato);
    if (anos >= 5) { score += 4; fortes.push(`Contrato típico de ${imovel.periodoContrato} dá segurança para o payback.`); }
  }

  score = Math.max(30, Math.min(98, score));
  if (!fortes.length) fortes.push('Ponto com características equilibradas para operação varejista.');
  if (!atencao.length) atencao.push('Sem pontos críticos identificados nos dados cadastrados.');

  const segmentos = [];
  if (area && area >= 100 && area <= 400) segmentos.push('Farmácias e drogarias', 'Empórios e produtos naturais', 'Pet shops');
  if (area && area < 100) segmentos.push('Óticas', 'Bijuterias e semijoias', 'Serviços e conveniência');
  if (area && area > 400) segmentos.push('Utilidades e varejo geral', 'Supermercados compactos', 'Concessionárias/showrooms');
  if (!segmentos.length) segmentos.push('Varejo de bairro', 'Serviços locais');

  return {
    score,
    resumo: `Ponto em ${imovel.bairro || imovel.cidade} com ${area ? area + ' m²' : 'área a confirmar'} e custo total de ${money(custo)}.`,
    conteudo: {
      pontosFortes: fortes,
      pontosAtencao: atencao,
      segmentosRecomendados: segmentos,
      indicadores: {
        custoM2: custoM2 ? Math.round(custoM2) : null,
        custoTotal: custo,
        areaTotal: area,
        frente, peDireito: pd,
      },
      recomendacao: score >= 80 ? 'Alta prioridade — apresentar aos clientes do segmento indicado.' :
        score >= 65 ? 'Bom potencial — recomenda-se visita e levantamento de fluxo.' :
        'Avaliar com cautela — validar fluxo e negociar condições.',
    },
  };
}

async function gerarAnalise(imovel) {
  const base = gerarAnaliseInterna(imovel);
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ...base, modelo: 'motor-interno' };
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um analista de geomarketing e expansão varejista. Responda em português, em tom executivo, com 1 parágrafo de resumo e listas curtas de pontos fortes, atenção e segmentos recomendados. Retorne JSON com campos resumo, pontosFortes[], pontosAtencao[], segmentosRecomendados[], recomendacao.' },
          { role: 'user', content: `Analise este ponto comercial: ${JSON.stringify(imovel)}` },
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
      conteudo: { ...base.conteudo, ...parsed },
      modelo: j.model || 'openai',
    };
  } catch (e) {
    console.error('IA externa falhou, usando motor interno:', e.message);
    return { ...base, modelo: 'motor-interno' };
  }
}

module.exports = { gerarAnalise, custoTotal };
