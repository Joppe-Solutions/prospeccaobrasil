/** Tipos de documento seguros para exposição pública (sem docs internos/sensíveis). DWG (arquivo editável de projeto) fica de fora de propósito. */
const DOC_PUBLICOS = new Set(['planta', 'inteligencia', 'rgi', 'avcb', 'convencao', 'regimento', 'iptu_doc']);

module.exports = { DOC_PUBLICOS };
