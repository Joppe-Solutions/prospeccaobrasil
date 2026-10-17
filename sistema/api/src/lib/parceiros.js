// Rótulos e registro profissional do parceiro (também usados no documento público de apresentação).
const TIPOS_PARCEIRO = { corretor: 'Corretor', imobiliaria: 'Imobiliária', advogado: 'Advogado', indicador: 'Indicador', outro: 'Parceiro' };

/** "CRECI Físico RJ-12345" (pessoa física), "CRECI Jurídico RJ-9876" (pessoa jurídica), "OAB RJ-123456" ou '' */
function registroProfissional(p) {
  if (!p) return '';
  if (['corretor', 'imobiliaria'].includes(p.tipo) && p.creci) return `CRECI ${p.tipoPessoa === 'pj' ? 'Jurídico' : 'Físico'} ${p.creciUf ? `${p.creciUf}-` : ''}${p.creci}`;
  if (p.tipo === 'advogado' && p.oab) return `OAB ${p.oabUf ? `${p.oabUf}-` : ''}${p.oab}`;
  return '';
}

// Só o que pode aparecer num documento público; contato do parceiro nunca vai junto
const PARCEIRO_PUBLICO = { nome: true, tipo: true, tipoPessoa: true, creci: true, creciUf: true, oab: true, oabUf: true };

module.exports = { TIPOS_PARCEIRO, registroProfissional, PARCEIRO_PUBLICO };
