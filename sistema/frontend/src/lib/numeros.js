// Máscaras numéricas pt-BR. O valor "canônico" é o que a API recebe: "1234.5" (ponto decimal, sem
// separador de milhar). O texto exibido é "1.234,5". Funções puras, sem React.

const MAX_INTEIRO = 12; // dígitos antes da vírgula

const agruparMilhar = (digitos) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** "1234.5" → "1.234,5"; com `fixo`, sempre `decimais` casas ("1.234,50") */
export function paraTexto(canonico, { decimais = 2, fixo = false } = {}) {
  if (canonico === '' || canonico == null || !Number.isFinite(Number(canonico))) return '';
  return Number(canonico).toLocaleString('pt-BR', { minimumFractionDigits: fixo ? decimais : 0, maximumFractionDigits: decimais });
}

/** Separa o que foi digitado em { inteiro, frac }: só dígitos e uma vírgula, no máximo `decimais` casas */
export function limpar(texto, decimais = 2) {
  // Campo inteiro: só dígitos (a vírgula é ignorada, como numa tecla inválida)
  const bruto = String(texto ?? '').replace(decimais > 0 ? /[^\d,]/g : /[^\d]/g, '');
  const virgula = bruto.indexOf(',');
  const inteiro = (virgula === -1 ? bruto : bruto.slice(0, virgula)).replace(/^0+(?=\d)/, '').slice(0, MAX_INTEIRO);
  const frac = decimais > 0 && virgula !== -1 ? bruto.slice(virgula + 1).replace(/,/g, '').slice(0, decimais) : null;
  return { inteiro, frac };
}

export const montarTexto = ({ inteiro, frac }) => (inteiro === '' && frac !== null ? '0' : agruparMilhar(inteiro)) + (frac !== null ? `,${frac}` : '');

/** { inteiro, frac } → "1234.5" ou "" */
export function canonicoDe({ inteiro, frac }) {
  if (inteiro === '' && !frac) return '';
  return `${inteiro || '0'}${frac ? `.${frac}` : ''}`;
}

/**
 * Quem digita "45.5" quer dizer 45,5. O ponto vira vírgula quando é digitado ou colado como separador
 * decimal ("45." / "45.5" / "1234.56"); nunca ao apagar, para não confundir com o ponto de milhar
 * ("1.234" apagado até "1.23" continua sendo milhar).
 */
export function normalizarEntrada(bruto, { tipo = '', dado = '', posicao = bruto.length, decimais = 2 } = {}) {
  if (decimais === 0 || tipo.startsWith('delete') || bruto.includes(',')) return bruto;
  if (dado === '.') return `${bruto.slice(0, posicao - 1)},${bruto.slice(posicao)}`;
  if (dado.length !== 1 && /^[^\d]*\d+\.\d{1,2}[^\d]*$/.test(bruto)) return bruto.replace('.', ',');
  return bruto;
}

/** Posição do cursor no texto exibido, mantendo `alvo` caracteres significativos (dígitos e vírgula) à esquerda */
export function posicaoDoCursor(exibido, alvo, inicio = 0) {
  if (alvo <= 0) return inicio;
  let conta = 0;
  for (let k = 0; k < exibido.length; k += 1) {
    if (/[\d,]/.test(exibido[k])) conta += 1;
    if (conta === alvo) return k + 1;
  }
  return exibido.length;
}

export const iguais = (a, b) => {
  const vazio = (v) => v === '' || v == null || !Number.isFinite(Number(v));
  return vazio(a) && vazio(b) ? true : !vazio(a) && !vazio(b) && Number(a) === Number(b);
};

// CPF e CNPJ: máscara de exibição e validação dos dígitos verificadores
export const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');
export function mascararDocumento(valor, tipoPessoa) {
  const d = soDigitos(valor).slice(0, tipoPessoa === 'juridica' ? 14 : 11);
  if (tipoPessoa === 'juridica') return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
}
function digitoVerificador(digitos, pesos) {
  const soma = digitos.split('').reduce((n, d, i) => n + Number(d) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}
export function documentoValido(valor, tipoPessoa) {
  const d = soDigitos(valor);
  if (!d) return true; // opcional
  if (/^(\d)\1+$/.test(d)) return false;
  if (tipoPessoa === 'juridica') {
    if (d.length !== 14) return false;
    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const p2 = [6, ...p1];
    return digitoVerificador(d.slice(0, 12), p1) === Number(d[12]) && digitoVerificador(d.slice(0, 13), p2) === Number(d[13]);
  }
  if (d.length !== 11) return false;
  const p1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [11, ...p1];
  return digitoVerificador(d.slice(0, 9), p1) === Number(d[9]) && digitoVerificador(d.slice(0, 10), p2) === Number(d[10]);
}
