// Documento de inteligência de mercado — A4, multi-página, imprimível.
// Renderiza a triagem heurística completa com dados do imóvel, achados e metodologia.
const styles = require('./inteligencia.styles');

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const present = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const money = (v) => present(v) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }) : 'Não informado';
const measure = (v, unit = 'm²') => present(v)
  ? `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`
  : 'Não informada';
const TIPOS = { locacao: 'Locação', venda: 'Venda' };
const CATEGORIAS = { loja: 'Loja', predio: 'Prédio', terreno: 'Terreno', outro: 'Outro' };
const STATUS = { disponivel: 'Disponível', negociacao: 'Em negociação', locado: 'Locado', vendido: 'Vendido' };
const address = (i) => [i.endereco, i.numero].filter(Boolean).join(', ') + (i.complemento ? ` - ${i.complemento}` : '');

function header(i, ref) {
  return `<header class="document-header"><a href="https://prospeccaobrasil.com.br" aria-label="Prospecção Brasil"><img class="logo" src="/images/logo-wide.png" alt="Prospecção Brasil - Retail & Real Estate"></a><div class="reference"><span>${esc(ref)}</span><strong>${esc(i.codigo)}</strong></div></header>`;
}
function footer(i, date) {
  return `<footer class="document-footer"><div><strong>Prospecção Brasil</strong><span>Inteligência de mercado · documento interno</span></div><div><span>Gerado em ${esc(date)}</span><span>${esc(i.codigo)} · prospeccaobrasil.com.br</span></div></footer>`;
}
const li = (arr) => (arr || []).map((p) => `<li>${esc(p)}</li>`).join('');
const fact = (label, value) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;

function renderInteligencia(imovel, analise) {
  const ai = analise?.conteudoJson ? JSON.parse(analise.conteudoJson) : {};
  const ind = ai.indicadores || {};
  const date = new Date(analise?.criadoEm || Date.now());
  const gerado = Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const title = imovel.titulo || address(imovel) || imovel.codigo;
  const subtitle = [imovel.bairro, [imovel.cidade, imovel.uf].filter(Boolean).join(' / ')].filter(Boolean).join(' · ');
  const score = analise?.score ?? ai.score ?? '—';
  const pct = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Number(score))) : 0;

  const identificacao = [
    fact('Código', imovel.codigo), fact('Tipo', TIPOS[imovel.tipo] || imovel.tipo),
    fact('Categoria', CATEGORIAS[imovel.categoria] || imovel.categoria || 'Não informada'),
    fact('Status', STATUS[imovel.status] || imovel.status),
    fact('Endereço', address(imovel) || 'Não informado'),
    fact('Bairro', imovel.bairro || 'Não informado'),
    fact('Cidade / UF', [imovel.cidade, imovel.uf].filter(Boolean).join(' / ') || 'Não informado'),
    fact('CEP', imovel.cep || 'Não informado'),
  ].join('');
  const dimensoes = [
    fact('Área total', measure(imovel.areaTotal)), fact('Área útil', measure(imovel.areaUtil)),
    fact('Piso / área de venda', measure(imovel.pisoAreaVenda)), fact('Jirau', measure(imovel.jirau)),
    fact('Mezanino', measure(imovel.mezanino)), fact('Frente', measure(imovel.frenteImovel, 'm')),
    fact('Pé-direito', measure(imovel.peDireito, 'm')),
  ].join('');
  const comerciais = [
    fact('Aluguel', money(imovel.aluguel)), fact('Condomínio', money(imovel.condominio)),
    fact('IPTU / cota', money(imovel.iptu)), fact('CDU', money(imovel.cdu)),
    fact('Preço de venda', money(imovel.precoVenda)),
    fact('Custo mensal de ocupação', money(ind.custoTotal)),
    fact('Custo por m²', ind.custoM2 ? money(ind.custoM2) : 'Não informado'),
    fact('Prazo de contrato', imovel.periodoContrato || 'Não informado'),
  ].join('');

  const faltando = ai.dadosInsuficientes || [];

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(imovel.codigo)} - Inteligência de mercado</title><style>${styles}</style></head><body>
<nav class="toolbar" aria-label="Ações do documento"><div><strong>Inteligência de mercado</strong><span>Documento A4 · ${esc(imovel.codigo)}</span></div><button type="button" onclick="window.print()">Imprimir / Salvar PDF</button></nav>
<main>
<article class="sheet" aria-label="Resumo executivo">${header(imovel, 'Inteligência de mercado')}
<section class="intro"><div class="eyebrow">Triagem de ponto comercial</div><h1>${esc(title)}</h1><p class="location">${esc(subtitle)}</p></section>
${ai.aviso ? `<p class="aviso"><strong>Importante:</strong> ${esc(ai.aviso)}</p>` : ''}
<div class="score-row"><div class="score-ring" style="background:conic-gradient(var(--gold) ${pct}%, #e7ebe6 0)"><span>${esc(score)}</span></div>
<div class="score-copy"><strong>Score de triagem</strong><p>${esc(analise?.resumo || 'Resumo não disponível.')}</p></div></div>
<div class="kpis">
<div><span>Custo mensal</span><strong>${money(ind.custoTotal)}</strong></div>
<div><span>Custo por m²</span><strong>${ind.custoM2 ? money(ind.custoM2) : 'Não informado'}</strong></div>
<div><span>Área total</span><strong>${measure(ind.areaTotal)}</strong></div>
<div><span>Frente / pé-direito</span><strong>${measure(ind.frente, 'm')} / ${measure(ind.peDireito, 'm')}</strong></div>
</div>
${ai.recomendacao ? `<div class="recommend"><strong>Recomendação:</strong> ${esc(ai.recomendacao)}</div>` : ''}
${faltando.length ? `<p class="missing"><strong>Dados insuficientes:</strong> faltam ${esc(faltando.join(', '))}. Complete o cadastro para uma triagem mais precisa.</p>` : ''}
${footer(imovel, gerado)}</article>

<article class="sheet" aria-label="Dados do imóvel e achados">${header(imovel, 'Dados do imóvel')}
<div class="section-intro"><span class="eyebrow">Base da análise</span><h2>Cadastro do imóvel</h2><p>${esc(subtitle)}</p></div>
<div class="two-col"><section><h2><span>01</span> Identificação</h2><dl class="facts">${identificacao}</dl></section>
<section><h2><span>02</span> Dimensões</h2><dl class="facts">${dimensoes}</dl></section></div>
<section class="section"><h2><span>03</span> Condições comerciais</h2><dl class="facts">${comerciais}</dl></section>
<div class="two-col"><section><h2><span>04</span> Pontos fortes</h2><ul class="findings fortes">${li(ai.pontosFortes)}</ul></section>
<section><h2><span>05</span> Pontos de atenção</h2><ul class="findings atencao">${li(ai.pontosAtencao)}</ul></section></div>
${footer(imovel, gerado)}</article>

<article class="sheet" aria-label="Segmentos e metodologia">${header(imovel, 'Conclusão e metodologia')}
<div class="section-intro"><span class="eyebrow">Aplicação</span><h2>Segmentos recomendados</h2><p>Perfis de operação compatíveis com os atributos cadastrados — sem dados de mercado externos.</p></div>
<div class="tags">${(ai.segmentosRecomendados || []).map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>
${ai.recomendacao ? `<div class="recommend"><strong>Próximo passo sugerido:</strong> ${esc(ai.recomendacao)}</div>` : ''}
<section class="section"><h2><span>06</span> Metodologia e limitações</h2>
<ul class="method">
<li>Este documento é uma <strong>triagem heurística</strong> gerada a partir exclusivamente dos dados cadastrados do imóvel no sistema Prospecção Brasil.</li>
<li>O score reflete a completude e os atributos físicos/comerciais do cadastro. Não representa valor de mercado, fluxo, renda ou demanda da região.</li>
<li>Comparativos de mercado, geomarketing, concorrência, renda e tráfego exigem fontes externas validadas e levantamento em campo.</li>
<li>Modelo utilizado: ${esc(analise?.modelo || 'triagem-interna')} · Gerado em ${esc(gerado)}.</li>
<li>Quando habilitado, provedor externo de IA recebe apenas atributos físicos/comerciais do ponto — sem dados de clientes, proprietários ou valores identificáveis de terceiros.</li>
</ul></section>
<p class="aviso">Este documento é interno e não deve ser apresentado como estudo de mercado a terceiros.</p>
${footer(imovel, gerado)}</article>
</main><p class="print-help">Para gerar o PDF, clique em “Imprimir / Salvar PDF” e escolha “Salvar como PDF”. Use papel A4 e desative os cabeçalhos e rodapés do navegador.</p>
</body></html>`;
}

module.exports = { renderInteligencia };
