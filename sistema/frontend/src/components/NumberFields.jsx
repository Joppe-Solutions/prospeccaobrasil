import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { canonicoDe, iguais, limpar, montarTexto, normalizarEntrada, paraTexto, posicaoDoCursor } from '../lib/numeros';

/**
 * Campo numérico com máscara pt-BR. `value`/`onChange` trabalham com o valor canônico ("1234.5"),
 * o mesmo que a API recebe; a tela mostra "1.234,5". Aceita digitar com vírgula (ou ponto, que vira vírgula).
 */
function NumeroMascarado({ value, onChange, onBlur, decimais = 2, fixo = false, prefixo = '', ...props }) {
  const ref = useRef(null);
  const alvo = useRef(null);
  const [texto, setTexto] = useState(() => paraTexto(value, { decimais }));

  // Valor alterado de fora (cadastro carregado, ABL sugerida pela soma): reexibe formatado
  useEffect(() => {
    if (!iguais(canonicoDe(limpar(texto, decimais)), value)) setTexto(paraTexto(value, { decimais }));
  }, [value]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (alvo.current == null || !el || document.activeElement !== el) return;
    const pos = posicaoDoCursor(el.value, alvo.current, prefixo.length);
    el.setSelectionRange(pos, pos);
    alvo.current = null;
  });

  function aoMudar(e) {
    const el = e.target;
    const posicao = el.selectionStart ?? el.value.length;
    const bruto = normalizarEntrada(el.value, { tipo: e.nativeEvent?.inputType || '', dado: e.nativeEvent?.data ?? '', posicao, decimais });
    const antesDoCursor = bruto.slice(0, bruto === el.value ? posicao : posicao).replace(/[^\d,]/g, '').length;
    const partes = limpar(bruto, decimais);
    alvo.current = antesDoCursor;
    setTexto(montarTexto(partes));
    onChange?.(canonicoDe(partes));
  }

  return <input ref={ref} inputMode={decimais ? 'decimal' : 'numeric'} autoComplete="off" {...props}
    value={texto ? prefixo + texto : ''} onChange={aoMudar}
    onBlur={e => { setTexto(paraTexto(value, { decimais, fixo })); onBlur?.(e); }} />;
}

/** R$ 1.234,56 */
export const DinheiroInput = (props) => <NumeroMascarado decimais={2} fixo prefixo="R$ " placeholder="R$ 0,00" {...props} />;
/** 1.234,5 (áreas, medidas, taxas) */
export const DecimalInput = ({ decimais = 2, ...props }) => <NumeroMascarado decimais={decimais} {...props} />;
/** 12 (quantidades, meses, vagas) */
export const InteiroInput = (props) => <NumeroMascarado decimais={0} {...props} />;

/** Escolhe o campo pelo tipo declarado nos formulários: 'dinheiro' | 'decimal' | 'inteiro' */
export function CampoNumerico({ formato, ...props }) {
  if (formato === 'dinheiro') return <DinheiroInput {...props} />;
  if (formato === 'inteiro') return <InteiroInput {...props} />;
  return <DecimalInput {...props} />;
}
