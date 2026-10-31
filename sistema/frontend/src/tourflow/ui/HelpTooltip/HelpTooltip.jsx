import { useState, useId } from 'react';
import './HelpTooltip.css';

/**
 * HelpTooltip — ícone de ajuda (?) ao lado de labels técnicos.
 * Centraliza o glossário do sistema e padroniza a explicação de termos.
 *
 * Uso:
 *   <HelpTooltip term="pax" />                       // busca no glossário
 *   <HelpTooltip text="Número de passageiros" />     // texto direto
 *   <label>Pax <HelpTooltip term="pax" /></label>
 */
const GLOSSARIO = {
  pax: 'Número de passageiros (do inglês "passengers"). Equivale ao total de pessoas que participarão do serviço.',
  net: 'Valor pago ao operador (parceiro/operadora), sem margem de lucro. É o custo base para cálculo do preço de venda.',
  'valor venda': 'Preço final cobrado do cliente. Calculado a partir do NET + margem + taxas.',
  margem: 'Diferença percentual entre o preço de venda e o NET. Representa o lucro da agência sobre o serviço.',
  tarifario: 'Tabela de preços cadastrada no sistema (Tarifas) que define os valores cobrados por categoria de veículo, passeio ou serviço.',
  temporada: 'Período do ano com preços diferenciados. No transfer, cadastre em Tarifário de Transfer → Preços avançados (sazonal, horário ou dia da semana).',
  'b2c': 'Venda direta para consumidor final (Business-to-Consumer). No sistema, refere-se aos preços exibidos no site público.',
  'b2b': 'Venda entre empresas (Business-to-Business). No sistema, refere-se aos preços praticados com parceiros/OTAs.',
  'br/ext': 'Indica se o preço é para cliente brasileiro (BR) ou estrangeiro (EXT). Estrangeiros costumam pagar preço diferenciado.',
  escopo: 'Onde o cupom pode ser aplicado: passeios, transfers, shuttle, etc. Define quais produtos aceitam o desconto.',
  invoice: 'Fatura ou documento fiscal emitido pelo operador. No Livro de Bordo, representa o valor a receber do operador.',
  conciliacao: 'Registro do pagamento de uma fatura/invoice. Confirma que o valor foi quitado com o operador.',
  wtt: 'Sigla interna da World Tour Travel. No cadastro de Tarifas, indica o preço de tabela da operadora.',
  'valor da maquina': 'Taxa cobrada pela maquininha de cartão (aproximadamente 4% em transações à vista). Usada no cálculo de impostos.',
  'taxa de maquina': 'Taxa cobrada pela maquininha de cartão (aproximadamente 4% em transações à vista). Usada no cálculo de impostos.',
  'antecedencia minima': 'Prazo mínimo (em horas) entre a reserva no e-commerce e a realização do serviço. No painel interno o orçamento não é bloqueado: o sistema só avisa na finalização.',
  'capacidade maxima': 'Número máximo de pessoas que podem participar do serviço em uma única operação.',
  'ponto de encontro': 'Local onde os passageiros encontram o guia/motorista quando o embarque não é no hotel.',
  'logistica embarque': 'Define como os passageiros serão embarcados: no hotel, em ponto de encontro específico, ou ambos.',
  'rota shuttle': 'Rota fixa de transfer compartilhado entre dois pontos (ex: aeroporto ↔ hotel), com horários pré-definidos.',
  'roteiro esperado': 'Sequência planejada de checkpoints que o motorista deve seguir durante o transfer.',
  'cota unica': 'Pagamento à vista do licenciamento DETRAN, em uma única parcela.',
  'cadastur': 'Cadastro de prestadores de serviços turísticos no Ministério do Turismo. Obrigatório para guias e agências.',
  'ticket medio': 'Valor médio gasto por cliente em cada compra. Calculado dividindo a receita total pelo número de vendas.',
  'uso unico por cliente': 'O cupom pode ser usado apenas uma vez por cada cliente. Diferente de "uso ilimitado".',
  '1x cliente': 'O cupom pode ser usado apenas uma vez por cada cliente.',
  'ingest manual': 'Importação manual de reservas a partir de parceiros/OTAs (Booking, Airbnb, etc.).',
  'expurgo': 'Remoção permanente de dados de clientes conforme política de retenção LGPD.',
  'retencao lgpd': 'Prazo (em dias) que o sistema mantém dados de clientes antes do expurgo automático.',
  vip: 'Cliente marcado como VIP, com tratamento diferenciado (prioridade, benefícios).',
  'status operacional': 'Situação atual da reserva no fluxo operacional: rascunho, pendente, confirmada, em execução, concluída, cancelada.',
  'margem aplicada': 'Percentual de margem aplicado sobre o NET para definir o preço de venda ao cliente.',
  'referencia externa': 'Código ou identificador usado pelo parceiro/OTA para a reserva (ex: número da reserva no Booking).',
  'fornecedor parceiro': 'Empresa parceira (OTA, agência, operadora) que envia reservas para o sistema.',
  'tipo de servico': 'Categoria do transfer: ida, volta, ida e volta, disposição, por hora, shuttle compartilhado.',
  'categoria de veiculo': 'Tipo de veículo contratado (econômico, executivo, van, micro-ônibus). Define o preço base.',
  'previa de custo': 'Estimativa de custo do transfer antes da confirmação, baseada em tarifa + extras + impostos.',
  'completar participantes depois': 'Permite salvar a reserva sem informar os nomes dos passageiros. Os nomes serão solicitados após a confirmação.',
  classificacao: 'Categoria do item no itinerário: Ingresso (entrada de atração), Passeio (tour guiado) ou Restaurante (refeição). Define como o item aparece na vitrine.',
  'parceiro ota': 'Parceiro ou OTA (Online Travel Agency) que envia reservas para o sistema. Ex: Booking, Airbnb, Mozio, Viator.',
  ota: 'OTA (Online Travel Agency) — plataforma online que vende serviços turísticos. Ex: Booking, Airbnb, Viator.',
  sync: 'Sincronização manual das reservas recebidas de parceiros/OTAs via Supabase/N8N. Busca novas reservas pendentes de validação.',
  'sincronizar supabase': 'Busca manualmente novas reservas recebidas de parceiros via Supabase. Equivalente ao "sync" automático, mas executado sob demanda.',
  'motivo negacao': 'Motivo pelo qual a reserva está sendo negada. Será registrado no histórico e, se aplicável, incluído na comunicação ao cliente/parceiro.',
  'observacao email': 'Observação opcional incluída no e-mail enviado ao operador, logo abaixo do resumo da reserva.',
  'preco base': 'Valor de referência da categoria de veículo usado como ponto de partida para cálculo de tarifas. O preço final pode variar conforme temporada, rota e margens aplicadas.',
};

export function getGlossarioTermo(termo) {
  const key = String(termo || '').toLowerCase().trim();
  return GLOSSARIO[key] || null;
}

export default function HelpTooltip({ term, text, icon = 'fa-circle-question', placement = 'top' }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const content = text || getGlossarioTermo(term);

  if (!content) return null;

  return (
    <span className="wt-help-tooltip">
      <button
        type="button"
        className="wt-help-tooltip__btn"
        aria-describedby={open ? tooltipId : undefined}
        aria-label={`Ajuda: ${term || 'termo'}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <i className={`fas ${icon}`} />
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`wt-help-tooltip__bubble wt-help-tooltip__bubble--${placement}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
