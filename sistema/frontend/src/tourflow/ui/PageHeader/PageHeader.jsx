import { Children, Fragment, isValidElement, useRef, useState } from 'react';
import Button from '../Button/Button';
import './PageHeader.css';

/** Ações secundárias: vão para o menu "⋯" em vez de disputar com a ação principal. */
const ACAO_SECUNDARIA = /export|import|imprimir|baixar|download|configura|reparar|recalcular|verificar|personalizar colunas|gerar link|atualizar/i;

function textoDe(no) {
  if (no == null || typeof no === 'boolean') return '';
  if (typeof no === 'string' || typeof no === 'number') return String(no);
  if (Array.isArray(no)) return no.map(textoDe).join('');
  if (isValidElement(no)) return textoDe(no.props.children);
  return '';
}

/**
 * Separa as ações: <Button> de ação secundária (exportar, importar, imprimir…)
 * vira item do menu "⋯"; o resto (ação principal, abas, período) fica visível.
 * Desce em fragmentos e <div>s de agrupamento.
 */
function separarAcoes(no, secundarias) {
  return Children.map(no, (filho) => {
    if (!isValidElement(filho)) return filho;
    if (filho.type === Fragment || (filho.type === 'div' && !filho.props.onClick)) {
      const filhos = separarAcoes(filho.props.children, secundarias);
      return filho.type === Fragment ? <>{filhos}</> : <div {...filho.props}>{filhos}</div>;
    }
    const rotulo = textoDe(filho.props.children).trim() || filho.props.title || filho.props['aria-label'] || '';
    if (filho.type === Button && filho.props.onClick && ACAO_SECUNDARIA.test(rotulo)) {
      secundarias.push({
        rotulo,
        icone: String(filho.props.icon || '').replace(/^fas?\s+/, '') || null,
        desabilitado: filho.props.disabled || filho.props.loading,
        aoSelecionar: filho.props.onClick,
      });
      return null;
    }
    return filho;
  });
}

/**
 * Cabeçalho padrão das páginas: trilha (do menu), título, subtítulo de uma
 * linha e, à direita, a ação principal + menu "⋯" com as secundárias.
 * `icon`/`iconContent` continuam aceitos, mas não são mais exibidos.
 */
export default function PageHeader({ title, subtitle, action, trilha, className = '' }) {
  const botaoMais = useRef(null);
  const [menu, setMenu] = useState(null);
  const caminho = (trilha || []).filter((t) => t && t !== title);

  const secundarias = [];
  const visiveis = action ? separarAcoes(action, secundarias) : null;

  return (
    <div className={`wt-page-header ${className}`}>
      <div className="wt-page-header-texto">
        {caminho.length > 0 && (
          <nav className="wt-page-header-trilha" aria-label="Você está em">
            {caminho.map((t, i) => (
              <span key={t}>{i > 0 && <i className="fas fa-chevron-right" aria-hidden="true" />}{t}</span>
            ))}
          </nav>
        )}
        <h1 className="wt-page-header-title">{title}</h1>
        {subtitle && <p className="wt-page-header-subtitle" title={typeof subtitle === 'string' ? subtitle : undefined}>{subtitle}</p>}
      </div>
      {(visiveis || secundarias.length > 0) && (
        <div className="wt-page-header-action">
          {secundarias.length > 0 && (
            <button
              ref={botaoMais}
              type="button"
              className="wt-page-header-mais"
              aria-label="Mais ações"
              title="Mais ações"
              aria-expanded={!!menu}
              onClick={() => {
                const r = botaoMais.current.getBoundingClientRect();
                setMenu({ x: Math.max(12, r.right - 220), y: r.bottom + 6 });
              }}
            >
              <i className="fas fa-ellipsis" aria-hidden="true" />
            </button>
          )}
          {visiveis}
        </div>
      )}
    </div>
  );
}
