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

module.exports = { fail, urlHttp };
