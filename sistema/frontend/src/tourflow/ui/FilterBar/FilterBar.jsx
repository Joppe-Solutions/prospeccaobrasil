import { Children, Fragment, isValidElement, useEffect, useState } from 'react';
import './FilterBar.css';

function flattenFilterChildren(children) {
  return Children.toArray(children).flatMap((child) => {
    if (child == null || child === false) return [];
    if (isValidElement(child) && child.type === Fragment) {
      return flattenFilterChildren(child.props.children);
    }
    return [child];
  });
}

const VAZIOS = new Set(['', 'todos', 'todas', 'all', 'null', 'undefined']);

/** O filtro está aplicado? null = não dá para saber pelas props. */
function filtroAtivo(el) {
  if (!isValidElement(el)) return null;
  const p = el.props;
  if ('value' in p) {
    const v = p.value;
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Boolean(v.start || v.end || v.de || v.ate);
    return !VAZIOS.has(String(v).trim().toLowerCase());
  }
  if ('de' in p || 'ate' in p) return Boolean(p.de || p.ate);
  if ('checked' in p) return Boolean(p.checked);
  if ('ativo' in p) return Boolean(p.ativo);
  return null;
}

/**
 * Barra de filtros padrão: uma linha compacta acima da tabela (sem cartão).
 * - Os `visiveis` primeiros filtros ficam à mostra; o resto atrás de
 *   "Mais filtros" (abre sozinho se algum escondido estiver aplicado).
 * - "Limpar filtros" só aparece com filtro aplicado (ou quando não dá para
 *   saber pelas props do filtro).
 */
export default function FilterBar({ open = true, onClear, extraActions, children, visiveis = 4 }) {
  const items = flattenFilterChildren(children);
  const extras = items.slice(visiveis);
  const estados = items.map(filtroAtivo);
  const ativosEscondidos = extras.filter((_, i) => estados[visiveis + i] === true).length;
  const algumAtivo = estados.some((e) => e === true);
  const incerto = estados.some((e) => e === null);
  const [mais, setMais] = useState(ativosEscondidos > 0);

  useEffect(() => { if (ativosEscondidos > 0) setMais(true); }, [ativosEscondidos]);

  if (!open) return null;

  const mostrados = mais ? items : items.slice(0, visiveis);

  return (
    <div className="wt-filterbar" role="search">
      {mostrados.map((child, index) => (
        <div key={child.key ?? index} className={`wt-filterbar__item ${index === 0 ? 'wt-filterbar__item--primeiro' : ''}`}>
          {child}
        </div>
      ))}
      <div className="wt-filterbar__acoes">
        {extras.length > 0 && (
          <button type="button" className="wt-filterbar__mais" aria-expanded={mais} onClick={() => setMais((v) => !v)}>
            <i className="fas fa-sliders" aria-hidden="true" />
            {mais ? 'Menos filtros' : `Mais filtros (${extras.length})`}
            {!mais && ativosEscondidos > 0 && <span className="wt-filterbar__contador">{ativosEscondidos}</span>}
          </button>
        )}
        {onClear && (algumAtivo || incerto) && (
          <button type="button" className="wt-filterbar__limpar" onClick={onClear}>
            Limpar filtros
          </button>
        )}
        {extraActions}
      </div>
    </div>
  );
}
