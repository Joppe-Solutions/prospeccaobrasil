import './StatusBadge.css';

/**
 * StatusBadge — traduz e colore status em português, padronizando badges em todo o sistema.
 *
 * Props:
 *   - status: string (qualquer status: draft, pending, expired, critical, warning, active, etc.)
 *   - label: string (override manual do rótulo; se omitido, usa tradução automática)
 *   - tone: "default" | "success" | "warning" | "error" | "info" | "neutral" (override manual)
 *   - size: "sm" | "md"
 *   - icon: string (FontAwesome, ex: "fa-clock")
 *   - dot: boolean (mostra bolinha antes do texto)
 *
 * Uso:
 *   <StatusBadge status="draft" />              // → "Rascunho" (cinza)
 *   <StatusBadge status="expired" />            // → "Vencido" (vermelho)
 *   <StatusBadge status="critical" />           // → "Crítico" (vermelho)
 *   <StatusBadge status="pending" />            // → "Pendente" (amarelo)
 *   <StatusBadge status="active" />             // → "Ativo" (verde)
 *   <StatusBadge status="warning" />            // → "Atenção" (amarelo)
 *   <StatusBadge status="confirmada" />         // → "Confirmada" (verde)
 *   <StatusBadge status="rascunho" />           // → "Rascunho" (cinza)
 */

function chaveStatus(status) {
  return String(status || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

// Chaves normalizadas (minúsculas, sem acento, espaço no lugar de _/-).
const STATUS_MAP = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  requested: { label: 'Solicitada', tone: 'warning' },
  solicitada: { label: 'Solicitada', tone: 'warning' },
  scheduled: { label: 'Agendada', tone: 'info' },
  agendada: { label: 'Agendada', tone: 'info' },
  delayed: { label: 'Atrasada', tone: 'error' },
  atrasada: { label: 'Atrasada', tone: 'error' },
  atraso: { label: 'Em atraso', tone: 'error' },
  'em atraso': { label: 'Em atraso', tone: 'error' },
  pending: { label: 'Pendente', tone: 'warning' },
  pendente: { label: 'Pendente', tone: 'warning' },
  'pending payment': { label: 'Pagamento pendente', tone: 'warning' },
  waiting: { label: 'Aguardando', tone: 'warning' },
  'waiting approval': { label: 'Aguardando aprovação', tone: 'warning' },
  'aguardando aprovacao': { label: 'Aguardando aprovação', tone: 'warning' },
  confirmed: { label: 'Confirmado', tone: 'success' },
  confirmado: { label: 'Confirmado', tone: 'success' },
  confirmada: { label: 'Confirmada', tone: 'success' },
  'confirmed paid': { label: 'Confirmado e pago', tone: 'success' },
  active: { label: 'Ativo', tone: 'success' },
  ativo: { label: 'Ativo', tone: 'success' },
  inactive: { label: 'Inativo', tone: 'neutral' },
  inativo: { label: 'Inativo', tone: 'neutral' },
  afastado: { label: 'Afastado', tone: 'warning' },
  approved: { label: 'Aprovado', tone: 'success' },
  aprovado: { label: 'Aprovado', tone: 'success' },
  aprovada: { label: 'Aprovada', tone: 'success' },
  rejected: { label: 'Rejeitado', tone: 'error' },
  reprovado: { label: 'Reprovado', tone: 'error' },
  reprovada: { label: 'Reprovada', tone: 'error' },
  negado: { label: 'Negado', tone: 'error' },
  'nao aprovado': { label: 'Não aprovado', tone: 'error' },
  expired: { label: 'Vencido', tone: 'error' },
  vencido: { label: 'Vencido', tone: 'error' },
  vencida: { label: 'Vencida', tone: 'error' },
  critical: { label: 'Crítico', tone: 'error' },
  warning: { label: 'Atenção', tone: 'warning' },
  atencao: { label: 'Atenção', tone: 'warning' },
  ok: { label: 'Ok', tone: 'success' },
  chamar: { label: 'Chamar', tone: 'error' },
  conversar: { label: 'Conversar', tone: 'warning' },
  em_dia: { label: 'Em dia', tone: 'success' },
  observacao: { label: 'Observação', tone: 'info' },
  cancelled: { label: 'Cancelado', tone: 'error' },
  canceled: { label: 'Cancelado', tone: 'error' },
  cancelado: { label: 'Cancelado', tone: 'error' },
  cancelada: { label: 'Cancelada', tone: 'error' },
  completed: { label: 'Concluído', tone: 'success' },
  complete: { label: 'Concluído', tone: 'success' },
  done: { label: 'Concluído', tone: 'success' },
  concluido: { label: 'Concluído', tone: 'success' },
  concluida: { label: 'Concluída', tone: 'success' },
  finished: { label: 'Finalizada', tone: 'success' },
  finalizado: { label: 'Finalizado', tone: 'success' },
  finalizada: { label: 'Finalizada', tone: 'success' },
  archived: { label: 'Arquivada', tone: 'neutral' },
  arquivada: { label: 'Arquivada', tone: 'neutral' },
  'in progress': { label: 'Em andamento', tone: 'warning' },
  inprogress: { label: 'Em andamento', tone: 'warning' },
  'em andamento': { label: 'Em andamento', tone: 'warning' },
  'em execucao': { label: 'Em andamento', tone: 'warning' },
  processing: { label: 'Processando', tone: 'info' },
  processando: { label: 'Processando', tone: 'info' },
  paid: { label: 'Pago', tone: 'success' },
  pago: { label: 'Pago', tone: 'success' },
  unpaid: { label: 'Não pago', tone: 'error' },
  'nao pago': { label: 'Não pago', tone: 'error' },
  'partially paid': { label: 'Pago parcialmente', tone: 'info' },
  failed: { label: 'Falhou', tone: 'error' },
  falhou: { label: 'Falhou', tone: 'error' },
  'no show': { label: 'No-show', tone: 'error' },
  noshow: { label: 'No-show', tone: 'error' },
  'em analise': { label: 'Em análise', tone: 'warning' },
  analise: { label: 'Em análise', tone: 'warning' },
  agrupado: { label: 'Agrupado', tone: 'info' },
  aberto: { label: 'Aberto', tone: 'neutral' },
  aberta: { label: 'Aberta', tone: 'warning' },
  'pendente analise': { label: 'Pendente de análise', tone: 'warning' },
  negada: { label: 'Negada', tone: 'error' },
  recebido: { label: 'Recebido', tone: 'success' },
  'em atendimento': { label: 'Em atendimento', tone: 'info' },
  resolvida: { label: 'Resolvida', tone: 'success' },
  resolvido: { label: 'Resolvido', tone: 'success' },
  'em dia': { label: 'Em dia', tone: 'success' },
  proximo: { label: 'Próximo do vencimento', tone: 'warning' },
  'proximo do vencimento': { label: 'Próximo do vencimento', tone: 'warning' },
  'nao informado': { label: 'Não informado', tone: 'neutral' },
  'em uso': { label: 'Em uso', tone: 'success' },
  'em manutencao': { label: 'Em manutenção', tone: 'warning' },
  'aguardando pecas': { label: 'Aguardando peças', tone: 'warning' },
  'em estoque': { label: 'Em estoque', tone: 'info' },
  emprestado: { label: 'Emprestado', tone: 'info' },
  baixado: { label: 'Baixado', tone: 'error' },
  vendido: { label: 'Vendido', tone: 'neutral' },
  extraviado: { label: 'Extraviado', tone: 'error' },
  paga: { label: 'Paga', tone: 'success' },
  recorrendo: { label: 'Recorrendo', tone: 'info' },
  ativa: { label: 'Ativa', tone: 'success' },
  inativa: { label: 'Inativa', tone: 'neutral' },
  vip: { label: 'VIP', tone: 'warning' },
  cadastro: { label: 'Cadastro', tone: 'neutral' },
  encontrado: { label: 'Encontrado', tone: 'success' },
  'nao encontrado': { label: 'Não encontrado', tone: 'warning' },
  danificado: { label: 'Danificado', tone: 'warning' },
  'troca vencida': { label: 'Troca vencida', tone: 'error' },
  'inspecao vencida': { label: 'Inspeção vencida', tone: 'error' },
  'troca proxima': { label: 'Troca próxima', tone: 'warning' },
  'inspecao proxima': { label: 'Inspeção próxima', tone: 'warning' },
};

export function traduzirStatus(status) {
  if (!status) return null;
  return STATUS_MAP[chaveStatus(status)] || null;
}

export default function StatusBadge({
  status,
  label,
  tone,
  size = 'sm',
  icon,
  dot = false,
  className = '',
}) {
  const mapped = traduzirStatus(status);
  const finalLabel = label || mapped?.label || String(status || '—');
  const finalTone = tone || mapped?.tone || 'neutral';

  const cls = [
    'wt-status-badge',
    `wt-status-badge--${finalTone}`,
    `wt-status-badge--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={cls} role="status">
      {dot && <span className="wt-status-badge__dot" aria-hidden="true" />}
      {icon && <i className={`fas ${icon}`} aria-hidden="true" />}
      <span className="wt-status-badge__label">{finalLabel}</span>
    </span>
  );
}
