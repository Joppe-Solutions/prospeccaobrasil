const COLLATOR_PT = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

export function compararTextoAlfabetico(a, b) {
  return COLLATOR_PT.compare(String(a ?? ''), String(b ?? ''));
}

export function textoOrdenacao(item, getTexto) {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (typeof getTexto === 'function') return String(getTexto(item) ?? '');
  return String(item.label ?? item.nome ?? item.name ?? item.nomeTarifa ?? '');
}

export function ehOpcaoSentinela(item) {
  if (item == null) return true;
  if (typeof item !== 'object') return item === '';
  if (!Object.prototype.hasOwnProperty.call(item, 'value')
    && !Object.prototype.hasOwnProperty.call(item, 'valor')) {
    return false;
  }
  const v = item.value ?? item.valor;
  if (v === '' || v == null) return true;
  const s = String(v).toLowerCase();
  return s === '*' || s === 'todos' || s === 'todas' || s === 'all' || s === 'none';
}

export function ehOpcaoFinal(item) {
  const texto = textoOrdenacao(item).trim().toLowerCase();
  return texto === 'outro' || texto === 'outros';
}

export function ordenarListaAlfabetica(lista, getTexto, { ordenar = true } = {}) {
  if (!ordenar || !Array.isArray(lista)) return Array.isArray(lista) ? lista : [];
  const inicio = [];
  const meio = [];
  const fim = [];
  for (const item of lista) {
    if (ehOpcaoSentinela(item)) inicio.push(item);
    else if (ehOpcaoFinal(item)) fim.push(item);
    else meio.push(item);
  }
  meio.sort((a, b) => compararTextoAlfabetico(textoOrdenacao(a, getTexto), textoOrdenacao(b, getTexto)));
  return [...inicio, ...meio, ...fim];
}

export function ordenarOpcoesSelect(options, { ordenar = true } = {}) {
  if (!ordenar || !Array.isArray(options)) return Array.isArray(options) ? options : [];
  const temGrupo = options.some((item) => Array.isArray(item?.options));
  if (temGrupo) {
    return options.map((item) => (
      Array.isArray(item?.options)
        ? { ...item, options: ordenarListaAlfabetica(item.options) }
        : item
    ));
  }
  return ordenarListaAlfabetica(options);
}
