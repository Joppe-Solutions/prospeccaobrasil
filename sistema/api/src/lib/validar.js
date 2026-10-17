// Validações compartilhadas pelas rotas. `fail` gera 400 pelo handler de erro global.
function fail(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  throw e;
}

// Aceita apenas links http(s); devolve a URL normalizada ou null se vazio.
function urlHttp(valor, rotulo = 'link') {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null;
  let u;
  try { u = new URL(String(valor).trim()); } catch { fail(`Informe um ${rotulo} válido`); }
  if (!['http:', 'https:'].includes(u.protocol)) fail(`O ${rotulo} deve começar com http:// ou https://`);
  return u.href;
}

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

function digitoVerificador(digitos, pesos) {
  const soma = digitos.split('').reduce((n, d, i) => n + Number(d) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}
// CPF (pf) ou CNPJ (pj) com dígitos verificadores; vazio é aceito (campo opcional)
function documentoValido(valor, tipoPessoa) {
  const d = soDigitos(valor);
  if (!d) return true;
  if (/^(\d)\1+$/.test(d)) return false;
  if (tipoPessoa === 'pj') {
    if (d.length !== 14) return false;
    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    return digitoVerificador(d.slice(0, 12), p1) === Number(d[12]) && digitoVerificador(d.slice(0, 13), [6, ...p1]) === Number(d[13]);
  }
  if (d.length !== 11) return false;
  const p1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  return digitoVerificador(d.slice(0, 9), p1) === Number(d[9]) && digitoVerificador(d.slice(0, 10), [11, ...p1]) === Number(d[10]);
}

module.exports = { fail, urlHttp, UFS, soDigitos, documentoValido };
