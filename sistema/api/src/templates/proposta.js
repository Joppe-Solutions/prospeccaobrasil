// Proposta Comercial — reproduz o modelo oficial da Prospecção Brasil (PDF "Proposta_Comercial_Modelo"):
// mesma capa, tipografia (Gelasio + Carlito), cores, textos e quebras de página. Só mudam os campos
// variáveis. Campo não preenchido aparece destacado entre colchetes, como no modelo.
const styles = require('./proposta.styles');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const espacado = (texto) => texto.split('').join(' ').replace(/ {3}/g, '   ');
const campo = (valor, rotulo) => (String(valor ?? '').trim() ? `<b class="v">${esc(String(valor).trim())}</b>` : `<b class="ph">[${rotulo}]</b>`);
const dataBR = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('/') : iso);

const ul = (itens) => `<ul>${itens.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const cols = (esq, dir) => `<div class="cols">${ul(esq)}${ul(dir)}</div>`;
const rotulo = (texto) => `<p class="lb">${espacado(texto)}</p>`;
const secao = (olho, titulo) => `<p class="eb">${espacado(olho)}</p><h1>${titulo}</h1>`;
const sub = (numero, titulo, nota = '') => `<h2><b>${numero}</b>${titulo}</h2>${nota ? `<p class="nota">${nota}</p>` : ''}`;
const previstas = (esq, dir) => rotulo('INFORMAÇÕES PREVISTAS') + cols(esq, dir);
const tags = (itens) => `<p class="tags">${itens.map((t) => `<span>${t}</span>`).join('')}</p>`;

function renderProposta(p) {
  const C = campo(p.empresa?.nome, 'NOME DA EMPRESA CLIENTE');
  const M = campo(p.marca, 'NOME DA MARCA');
  const N = campo(p.numero, 'Nº DA PROPOSTA');
  const D = campo(dataBR(p.data), 'DATA DA PROPOSTA');
  const pagina = (numero, corpo) => `<section class="pg">
<img class="hl" src="/proposta/logo-pb.png" alt=""><span class="hb">${espacado('PROSPECÇÃO BRASIL')}</span><span class="hr">${espacado('PROPOSTA COMERCIAL')}</span><i class="hx"></i>
<div class="bd">${corpo}</div>
<footer><span>Assessoria Estratégica de Expansão Imobiliária&nbsp; ·&nbsp; ${C}</span><span>${numero}</span></footer></section>`;

  const paginas = [
    `${secao('APRESENTAÇÃO', 'Mensagem da Proposta')}
<table class="kv first"><tr><th>Destinatário</th><td>${C}</td></tr><tr><th>Marca</th><td>${M}</td></tr><tr><th>Proponente</th><td>Prospecção Brasil Real Estate Imóveis LTDA.</td></tr><tr><th>Proposta nº</th><td>${N}</td></tr><tr><th>Data</th><td>${D}</td></tr></table>
<div class="carta"><p class="saud">Prezados Senhores,</p>
<p>A Prospecção Brasil oferece à ${C} uma assessoria imobiliária especializada para apoiar a implantação de novas unidades franqueadas, reduzir riscos na escolha dos pontos comerciais e aumentar as chances de sucesso de cada operação.</p>
<p>Nossa atuação contempla todo o processo imobiliário: definição das necessidades da marca, prospecção, análise, visitas, negociação e acompanhamento até a formalização da locação.</p>
<p>O objetivo é proporcionar à ${C} e aos seus franqueados mais agilidade, segurança, controle e eficiência no processo de expansão.</p></div>
<div class="sc">${secao('SEÇÃO 01', 'Objetivo da Assessoria')}</div>
<p>Identificar e viabilizar pontos comerciais estratégicos, compatíveis com:</p>
${ul(['O público da marca;', 'O modelo operacional;', 'O posicionamento comercial;', 'A região de expansão;', 'O investimento disponível;', 'O orçamento de cada franqueado.'])}
${rotulo('RESULTADOS ESPERADOS')}
${ul(['Redução do tempo de implantação das unidades;', 'Ampliação da qualidade das oportunidades avaliadas;', 'Redução de decisões baseadas exclusivamente em preço ou localização;', 'Apoio a negociações mais favoráveis;', `Preservação da padronização e do posicionamento da ${C};`, 'Maior segurança para os franqueados na escolha dos imóveis.'])}`,

    `${secao('SEÇÃO 02', `Benefícios para a ${C} e seus Franqueados`)}
<p>A Prospecção Brasil estruturará o processo imobiliário para contribuir com o crescimento da rede de forma mais organizada, previsível e estratégica.</p>
${rotulo('PRINCIPAIS BENEFÍCIOS')}
${ul(['Expansão orientada por critérios comerciais e estratégicos;', 'Seleção de imóveis alinhados ao perfil da marca;', 'Redução de riscos relacionados à localização e aos custos de ocupação;', 'Comparação objetiva entre diferentes oportunidades;', 'Negociação profissional com proprietários, administradoras e representantes de empreendimentos;', 'Acompanhamento de cada etapa até a formalização da locação;', 'Maior suporte ao franqueado durante a implantação.'])}
<div class="sc">${secao('SEÇÃO 03', 'Escopo dos Serviços')}</div>
${sub('3.1', 'Definição das Diretrizes de Expansão')}
<p>Alinhamento com a ${C} sobre:</p>
${cols(['Regiões prioritárias;', 'Territórios disponíveis;', 'Formatos de operação;', 'Área necessária;', 'Fachada e vitrine;'], ['Infraestrutura;', 'Investimento disponível;', 'Limite de custo de ocupação;', 'Critérios obrigatórios e desejáveis.'])}
<p class="apos">Essa etapa orientará toda a prospecção e assegurará que as oportunidades sejam avaliadas de acordo com as necessidades da marca e de cada franqueado.</p>
${sub('3.2', 'Prospecção de Pontos Comerciais')}
<p>Busca ativa de imóveis nas regiões aprovadas, incluindo:</p>
${ul(['Lojas de rua;', 'Galerias;', 'Shopping centers;', 'Centros comerciais;', 'Outros formatos compatíveis com a operação.'])}
<p>A prospecção considerará localização, visibilidade, acesso, fluxo de pessoas, perfil do público, vizinhança comercial e potencial de geração de negócios.</p>`,

    `${sub('3.3', 'Análise das Oportunidades').replace('<h2>', '<h2 class="topo">')}
<p>Avaliação preliminar dos imóveis quanto aos seguintes critérios:</p>
${cols(['Localização e acessibilidade;', 'Visibilidade e exposição da fachada;', 'Fluxo de pedestres e veículos;', 'Perfil do público da região;', 'Presença de negócios complementares;'], ['Concorrência e atratividade comercial;', 'Área e configuração do imóvel;', 'Custos de ocupação;', 'Necessidade de adaptações;', `Compatibilidade com as diretrizes da ${C}.`])}
${sub('3.4', 'Apresentação dos Imóveis')}
<p>Envio de fichas objetivas com as informações necessárias à tomada de decisão, incluindo:</p>
${ul(['Endereço e localização;', 'Fotos e características do imóvel;', 'Área e condições de ocupação;', 'Valor do aluguel e demais custos;', 'Condições comerciais;', 'Pontos positivos e restrições;', 'Estimativa preliminar das adaptações necessárias.'])}
${sub('3.5', 'Visitas e Negociação')}
<p>Organização das visitas e condução da interlocução com proprietários, administradoras e representantes dos empreendimentos. A negociação poderá envolver:</p>
${ul(['Valor do aluguel;', 'Carência;', 'Prazo contratual;', 'Garantias;', 'Reajustes;', 'Condições de entrega;', 'Participação em obras ou adequações;', 'Outras condições relevantes para a implantação.'])}
${sub('3.6', 'Acompanhamento da Contratação')}
<p>Acompanhamento comercial até a formalização da locação, incluindo:</p>
${ul(['Organização das informações imobiliárias disponíveis;', 'Interface com os responsáveis jurídicos, técnicos e financeiros;', 'Controle de documentos e pendências;', 'Acompanhamento das aprovações;', 'Registro das condições finais negociadas.'])}`,

    `${secao('SEÇÃO 04', 'Fluxo de Aprovação')}
<p>O processo seguirá as etapas abaixo:</p>
<table class="etapas"><tr><th>${espacado('ETAPA')}</th><th>${espacado('ATIVIDADE')}</th></tr>
${['Definição das diretrizes da unidade', 'Prospecção de imóveis', 'Análise e seleção das oportunidades', `Apresentação à ${C} e ao franqueado`, 'Visita aos imóveis aprovados', 'Negociação das condições comerciais', 'Aprovação final do ponto', 'Apoio até a formalização da locação'].map((a, i) => `<tr><td>0${i + 1}</td><td>${a}</td></tr>`).join('')}</table>
${rotulo('CRITÉRIO DE AVANÇO')}
<p>O avanço de cada oportunidade dependerá de:</p>
${ul([`Aprovação da ${C};`, 'Concordância do franqueado;', 'Compatibilidade com o investimento disponível;', 'Adequação da localização;', 'Viabilidade das condições comerciais;', 'Disponibilidade da documentação necessária.'])}
<div class="sc">${secao('SEÇÃO 05', `Responsabilidades da ${C} e do Franqueado`)}</div>
<p>Para garantir agilidade e qualidade ao processo, caberá à ${C} e ao franqueado:</p>
${cols(['Informar os requisitos imobiliários e operacionais da marca;', 'Definir regiões e territórios prioritários;', 'Informar unidades existentes e áreas protegidas, quando aplicável;', 'Estabelecer o orçamento de implantação;', 'Definir o custo máximo de ocupação;'], ['Indicar os responsáveis pelas aprovações;', 'Disponibilizar a documentação e a qualificação do futuro locatário;', 'Validar a viabilidade financeira, técnica e de licenciamento da unidade;', 'Participar das decisões dentro dos prazos acordados.'])}`,

    `${secao('SEÇÃO 06', 'Abrangência e Prazo')}
<table class="kv dark a"><tr><th>${espacado('ITEM')}</th><th>${espacado('INFORMAÇÃO')}</th></tr>
<tr><th>Área de atuação</th><td>${campo(p.areaAtuacao, 'ÁREA DE ATUAÇÃO')}, nas regiões definidas em conjunto</td></tr>
<tr><th>Quantidade inicial de unidades</th><td>${campo(p.quantidadeUnidades, 'QUANTIDADE DE UNIDADES')}</td></tr>
<tr><th>Prazo de atuação</th><td>${campo(p.prazoAtuacao, 'PRAZO DE ATUAÇÃO')}, contado a partir do recebimento das diretrizes e informações necessárias</td></tr></table>
<p class="apos2">O prazo poderá ser ajustado conforme:</p>
${ul(['Disponibilidade de imóveis;', 'Ritmo de aprovação;', 'Características de cada região;', 'Complexidade das negociações;', 'Necessidade de análises complementares.'])}
<div class="sc">${secao('SEÇÃO 07', 'Condições Comerciais')}</div>
<table class="kv dark b"><tr><th>${espacado('ITEM')}</th><th>${espacado('CONDIÇÃO')}</th></tr>
<tr><th>Contratante e responsável pelo pagamento</th><td>${campo(p.contratante, 'CONTRATANTE')}</td></tr>
<tr><th>Honorários de planejamento e prospecção</th><td>${campo(p.honorariosProspeccao, 'HONORÁRIOS DE PROSPECÇÃO')}</td></tr>
<tr><th>Remuneração pela intermediação</th><td>${campo(p.remuneracaoIntermediacao, 'REMUNERAÇÃO DE INTERMEDIAÇÃO')}</td></tr>
<tr><th>Forma e vencimento dos pagamentos</th><td>${campo(p.formaPagamento, 'FORMA DE PAGAMENTO')}</td></tr>
<tr><th>Despesas extraordinárias</th><td>Mediante aprovação prévia do contratante</td></tr>
<tr><th>Exclusividade</th><td>${campo(p.exclusividade, 'EXCLUSIVIDADE')}</td></tr></table>
${rotulo('FORMALIZAÇÃO DAS CONDIÇÕES')}
<p>As condições comerciais serão formalizadas antes do início dos serviços, com definição clara de:</p>
${ul(['Entregas;', 'Responsabilidades;', 'Prazos;', 'Forma de pagamento;', 'Eventos que gerarão direito à remuneração;', 'Tratamento de despesas extraordinárias;', 'Eventual exclusividade.'])}`,

    `<p class="nota topo">Qualquer remuneração eventualmente recebida da parte proprietária será informada previamente e considerada no ajuste comercial entre as partes.</p>
<div class="sc">${secao('SEÇÃO 08', 'Entregas Previstas')}</div>
${sub('8.1', 'Ficha de Diretrizes de Expansão', 'Documento inicial para registrar as premissas da unidade e orientar a busca imobiliária.')}
${previstas(['Nome da marca e identificação da unidade;', 'Nome e contato do franqueado;', 'Região, cidade, bairro e raio de busca;', 'Territórios prioritários e áreas a evitar;', 'Formato da unidade;', 'Área mínima, ideal e máxima;', 'Largura mínima de fachada;', 'Necessidade de vitrine;', 'Estacionamento, acesso e visibilidade;', 'Perfil do público-alvo;', 'Fluxo mínimo desejado de pedestres e veículos;'], ['Proximidade de polos geradores de demanda;', 'Presença de concorrentes e negócios complementares;', 'Investimento disponível para implantação;', 'Limite mensal de aluguel;', 'Custo total máximo de ocupação;', 'Prazo desejado para inauguração;', 'Necessidades de infraestrutura e adaptações;', 'Critérios obrigatórios, desejáveis e eliminatórios;', 'Responsáveis pela aprovação;', 'Prazo para retorno.'])}
${sub('8.2', 'Plano de Prospecção por Região', 'Relatório de planejamento da busca para cada região aprovada.')}
${previstas(['Região, bairros e subáreas contempladas;', 'Justificativa comercial da região;', 'Perfil demográfico e de consumo observado;', 'Principais polos comerciais e geradores de fluxo;', 'Vias de acesso, transporte público e estacionamento;', 'Mapeamento preliminar de concorrentes;', 'Negócios complementares e âncoras próximas;', 'Faixas estimadas de aluguel e custos de ocupação;'], ['Tipos de imóveis prioritários;', 'Fontes de prospecção utilizadas;', 'Estratégia de contato com proprietários e administradoras;', 'Quantidade estimada de imóveis pesquisados;', 'Cronograma de prospecção;', 'Critérios de triagem e classificação;', 'Riscos, restrições e pontos de atenção;', 'Próximas ações e responsáveis.'])}
${sub('8.3', 'Relação de Imóveis Selecionados', 'Lista consolidada das oportunidades que atenderem aos critérios mínimos.')}`,

    `<div class="topo">${previstas(['Número de identificação da oportunidade;', 'Data de inclusão e última atualização;', 'Endereço completo;', 'Região, bairro e referência;', 'Link ou coordenadas de localização;', 'Tipo de imóvel e empreendimento;', 'Área total e área útil;', 'Largura de fachada e posição da loja;', 'Situação de ocupação e disponibilidade;', 'Nome e contato do proprietário, corretor ou administradora;'], ['Valor do aluguel;', 'Condomínio, IPTU e demais encargos;', 'Custo total mensal estimado;', 'Prazo contratual e garantias solicitadas;', 'Carência e condições de entrega;', 'Status da oportunidade;', 'Grau de aderência às diretrizes;', 'Observações e pendências;', 'Próxima ação prevista.'])}</div>
${sub('8.4', 'Ficha Técnica e Comercial da Oportunidade', 'Documento individual de análise do imóvel.')}
${previstas(['Identificação e localização;', 'Mapa, fotos externas e internas;', 'Data da vistoria ou coleta das informações;', 'Área, planta e configuração dos ambientes;', 'Fachada, vitrine, acessos e visibilidade;', 'Fluxo de pedestres e veículos, quando disponível;', 'Transporte público, estacionamento e acessibilidade;', 'Vizinhança comercial e polos geradores de demanda;', 'Concorrentes próximos;', 'Adequação ao público e ao posicionamento da marca;', 'Infraestrutura existente;', 'Necessidade de obras, reformas ou adequações;'], ['Restrições condominiais, urbanísticas ou operacionais;', 'Valor do aluguel e índice de reajuste;', 'Condomínio, IPTU, taxas e demais encargos;', 'Custo total de ocupação;', 'Carência, luvas, garantias e demais condições comerciais;', 'Prazo de contrato e condições de renovação;', 'Pontos fortes;', 'Pontos fracos e riscos;', 'Pendências documentais ou técnicas;', 'Recomendação da Prospecção Brasil;', 'Classificação da oportunidade;', 'Próximos passos.'])}
${rotulo('CLASSIFICAÇÃO RECOMENDADA')}${tags(['Aprovado', 'Aprovado com ressalvas', 'Não recomendado'])}
${sub('8.5', 'Quadro Comparativo de Custos de Ocupação', 'Planilha comparativa das oportunidades avaliadas.')}
${previstas(['Identificação do imóvel;', 'Área e custo por metro quadrado;'], ['Estimativa de custos de adaptação;', 'Custo inicial estimado;'])}`,

    `<div class="topo">${cols(['Aluguel mensal e anual;', 'Condomínio mensal;', 'IPTU mensal ou anual;', 'Taxas de administração;', 'Fundo de promoção;', 'Seguro e demais encargos;', 'Carência concedida;', 'Luvas ou valores de entrada;'], ['Custo mensal total;', 'Custo anual total;', 'Reajuste previsto;', 'Garantia exigida;', `Comparação com o limite definido pela ${C};`, 'Percentual de comprometimento do orçamento;', 'Valores confirmados ou estimados;', 'Classificação financeira da oportunidade.'])}</div>
${sub('8.6', 'Relatório de Visitas', 'Relatório elaborado após cada visita ou rodada de visitas.')}
${previstas(['Data, horário e participantes;', 'Imóveis visitados;', 'Condições encontradas no local;', 'Estado de conservação;', 'Medidas e características confirmadas;', 'Fluxo, visibilidade e acessibilidade observados;', 'Compatibilidade com a operação;', 'Necessidades de obras ou adequações;'], [`Impressões do franqueado e da ${C};`, 'Fotos e documentos coletados;', 'Pontos positivos e negativos;', 'Pendências a esclarecer;', 'Recomendação de continuidade ou descarte;', 'Próximas ações e responsáveis;', 'Prazo para decisão.'])}
${sub('8.7', 'Atualização de Negociações', 'Relatório de acompanhamento das tratativas comerciais.')}
${previstas(['Imóvel e partes envolvidas;', 'Data de início da negociação;', 'Condições inicialmente apresentadas;', 'Propostas e contrapropostas;', 'Valor de aluguel negociado;', 'Carência, prazo e garantias;', 'Reajustes e demais encargos;', 'Condições de entrega e obras;'], ['Prazos para resposta;', 'Documentos solicitados e recebidos;', `Pendências do proprietário, franqueado ou ${C};`, 'Riscos e pontos de atenção;', 'Status atual da negociação;', 'Próxima ação, responsável e prazo;', 'Histórico das alterações comerciais.'])}
${sub('8.8', 'Controle das Propostas até a Decisão Final', 'Mapa de controle de cada proposta.')}
${previstas(['Identificação do imóvel e da proposta;'], ['Documentos pendentes;'])}`,

    `<div class="topo">${cols(['Data de envio e validade;', 'Responsável pelo envio e recebimento;', 'Condições comerciais apresentadas;', 'Aprovações internas necessárias;', `Retornos da ${C} e do franqueado;`, 'Contrapropostas e revisões;'], ['Prazos de validade e datas críticas;', 'Situação da proposta;', 'Motivo da decisão;', 'Registro da aprovação final ou descarte;', 'Próximas providências.'])}</div>
${rotulo('STATUS PADRONIZADOS')}${tags(['Em análise', 'Aprovada', 'Recusada', 'Suspensa', 'Expirada'])}
${sub('8.9', 'Suporte Comercial até a Formalização da Locação', 'Relatório de encerramento e controle da contratação.')}
${previstas(['Imóvel aprovado e partes contratantes;', 'Condições comerciais finais;', 'Valor do aluguel, encargos e garantias;', 'Prazo contratual e data prevista de início;', 'Carência e condições de entrega;', 'Relação de documentos necessários;', 'Documentos recebidos e pendentes;', 'Contatos dos responsáveis jurídicos, técnicos e financeiros;'], ['Cronograma de análise e assinatura;', 'Pendências para emissão ou revisão do contrato;', `Registro das aprovações da ${C} e do franqueado;`, 'Data de assinatura ou motivo da não formalização;', 'Divergências entre a proposta inicial e as condições finais;', 'Próximos passos para entrega das chaves e implantação;', 'Encerramento da oportunidade.'])}
<div class="carta limites">${rotulo('LIMITES DA CONTRATAÇÃO')}<p>A contratação contempla a assessoria imobiliária. Poderão ser contratados separadamente: estudos técnicos especializados, projetos, obras, licenciamento, laudos, consultorias específicas e captação de novos franqueados.</p></div>
<div class="sc">${secao('SEÇÃO 09', 'Diferenciais da Prospecção Brasil')}</div>
<p>A Prospecção Brasil combina conhecimento do mercado imobiliário, atuação comercial e acompanhamento próximo para transformar a escolha do ponto em uma decisão mais segura e estratégica.</p>
${rotulo('NOSSO COMPROMISSO')}
${ul([`Atendimento personalizado à ${C} e a cada franqueado;`, 'Busca direcionada, evitando perda de tempo com imóveis inadequados;'])}`,

    `<div class="topo">${ul(['Análise prática das condições comerciais;', 'Negociação focada na viabilidade da unidade;', 'Comunicação clara durante todo o processo;', 'Apoio à expansão com visão de longo prazo.'])}</div>
<div class="sc">${secao('SEÇÃO 10', 'Validade e Aceite')}</div>
<table class="kv a first"><tr><th>Validade da proposta</th><td>${campo(p.validade, 'VALIDADE DA PROPOSTA')}</td></tr></table>
<p class="apos2">Após o preenchimento das condições comerciais e o aceite, será formalizado o instrumento de prestação de serviços.</p>
${rotulo('PRÓXIMO PASSO PARA APROVAÇÃO')}
<p>Para avançar, a ${C} deverá:</p>
<ol>${['Validar o escopo dos serviços;', 'Definir o contratante e o responsável pelo pagamento;', 'Preencher as condições comerciais;', 'Confirmar a abrangência e o prazo de atuação;', 'Indicar os responsáveis pelas aprovações;', 'Formalizar o aceite da proposta.'].map((t, i) => `<li><b>0${i + 1}</b>${t}</li>`).join('')}</ol>
<p class="fecho">A Prospecção Brasil está preparada para apoiar a ${C} na construção de uma expansão mais rápida, organizada e sustentável, contribuindo para que cada franqueado encontre um ponto comercial compatível com seu investimento e com o potencial da marca.</p><i class="dm"></i>`,

    `${secao('FORMALIZAÇÃO', 'Termo de Aceite')}
<p>A ${C} declara estar de acordo com os termos e condições desta proposta comercial.</p>
<div class="ass"><i></i><p>${espacado('ASSINATURA')}   —   <span>${C}</span></p><i></i><p>${espacado('NOME DO RESPONSÁVEL')}</p><i></i><p>${espacado('CARGO')}</p><i></i><p>${espacado('DATA (DD/MM/AAAA)')}</p></div>
<p class="lb obs">${espacado('OBSERVAÇÕES')}</p><div class="caixa"></div>`,
  ];

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Proposta Comercial ${esc(p.numero || '')} - ${esc(p.empresa?.nome || '')}</title><style>${styles}</style></head><body>
<nav class="toolbar"><div><strong>Proposta comercial ${esc(p.numero || '')}</strong><span>Documento A4 · modelo oficial Prospecção Brasil</span></div><button type="button" onclick="window.print()">Imprimir / Salvar PDF</button></nav>
<main>
<section class="pg capa"><i class="dm"></i>
<p class="c1">${espacado('PROSPECÇÃO BRASIL')}</p><p class="c2">REAL ESTATE</p>
<p class="c3">${espacado('PROPOSTA COMERCIAL')}</p>
<p class="c4">Assessoria Estratégica de<br>Expansão Imobiliária<br><em>para Unidades Franqueadas</em></p>
<p class="c5">${espacado('PREPARADA PARA')}</p><p class="c6">${C}</p><p class="c7">Marca&nbsp; ${M}</p>
<p class="c8">${N}&nbsp;&nbsp; ·&nbsp;&nbsp; Rio de Janeiro&nbsp;&nbsp; ·&nbsp;&nbsp; ${D}</p></section>
${paginas.map((corpo, i) => pagina(i + 1, corpo)).join('\n')}
</main><p class="print-help">Para gerar o PDF, clique em “Imprimir / Salvar PDF”, escolha “Salvar como PDF”, papel A4, margens “Nenhuma” e ative “Gráficos de plano de fundo”.</p>
</body></html>`;
}

module.exports = { renderProposta };
