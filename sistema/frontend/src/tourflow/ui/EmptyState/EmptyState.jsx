import './EmptyState.css';

/**
 * Estado vazio padronizado: ícone, título, descrição opcional e ação (CTA).
 *
 * @example
 * <EmptyState
 *   icon="fas fa-users"
 *   title="Nenhum cliente cadastrado"
 *   description="Cadastre o primeiro cliente para começar."
 *   action={{ label: 'Novo cliente', onClick: abrirForm, icon: 'fas fa-plus' }}
 * />
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  variant = 'empty',
  className = '',
}) {
  const isError = variant === 'error';
  const icone = icon || (isError ? 'fas fa-exclamation-circle' : 'fas fa-inbox');

  return (
    <div className={`wt-empty-state ${isError ? 'wt-empty-state--error' : ''} ${compact ? 'wt-empty-state--compact' : ''} ${className}`.trim()}>
      <div className="wt-empty-state__icon-wrap">
        <i className={`${icone} wt-empty-state__icon`} aria-hidden="true" />
      </div>
      <p className="wt-empty-state__title">{title}</p>
      {description && <p className="wt-empty-state__description">{description}</p>}
      {action && (
        <button type="button" className="wt-empty-state__action" onClick={action.onClick}>
          {action.icon && <i className={action.icon} aria-hidden="true" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
