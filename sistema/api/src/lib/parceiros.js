// Rótulos e registro profissional do parceiro (também usados no documento público de apresentação).
const TIPOS_PARCEIRO = { consultor: 'Consultor', advogado: 'Advogado', corretor: 'Corretor', imobiliaria: 'Imobiliária', indicador: 'Indicador' };

/** "CRECI-PF RJ-12345" (corretor), "CRECI-PJ RJ-9876" (imobiliária), "OAB RJ-123456" (advogado) ou '' (consultor, indicador) */
function registroProfissional(p) {
  if (!p) return '';
  if (['corretor', 'imobiliaria'].includes(p.tipo) && p.creci) return `CRECI-${p.tipo === 'imobiliaria' ? 'PJ' : 'PF'} ${p.creciUf ? `${p.creciUf}-` : ''}${p.creci}`;
  if (p.tipo === 'advogado' && p.oab) return `OAB ${p.oabUf ? `${p.oabUf}-` : ''}${p.oab}`;
  return '';
}

// Só o que pode aparecer num documento público; contato do parceiro nunca vai junto
const PARCEIRO_PUBLICO = { nome: true, tipo: true, tipoPessoa: true, creci: true, creciUf: true, oab: true, oabUf: true };

module.exports = { TIPOS_PARCEIRO, registroProfissional, PARCEIRO_PUBLICO };
