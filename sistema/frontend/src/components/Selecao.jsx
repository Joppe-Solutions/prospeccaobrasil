import { Children, isValidElement } from 'react';
import Select from '../tourflow/ui/Select/Select';

const texto = no => (Array.isArray(no) ? no.map(texto).join('') : no == null || typeof no === 'boolean' ? '' : String(no));

function opcoesDe(children) {
  return Children.toArray(children).flatMap(filho => {
    if (!isValidElement(filho)) return [];
    if (filho.type === 'option') return [{ value: filho.props.value ?? texto(filho.props.children), label: texto(filho.props.children), disabled: filho.props.disabled }];
    return opcoesDe(filho.props.children);
  });
}

// Dropdown do TourFlow com a mesma API de <select>. O <select> real fica por baixo, invisível:
// mantém rótulo, teclado, leitor de tela e a validação de `required`.
export default function Selecao({ id, value, onChange, required, disabled, children, className = '', 'aria-label': ariaLabel }) {
  const opcoes = opcoesDe(children);
  const trocar = valor => onChange?.({ target: { value: String(valor ?? '') } });
  return <div className={`selecao ${className}`}>
    <select className="selecao-nativa" id={id} aria-label={ariaLabel} value={value ?? ''} required={required} disabled={disabled} onChange={e => trocar(e.target.value)}>{children}</select>
    <Select options={opcoes} value={value ?? ''} onChange={trocar} disabled={disabled} ordenar={false} searchable={opcoes.length > 8} />
  </div>;
}
