// Domicílios por classe social (A1 … D/E). O Censo 2022 não divulga a distribuição de renda dos domicílios por
// bairro; só a média e a mediana do rendimento do responsável. A distribuição é ESTIMADA ajustando uma curva
// lognormal a esses dois números (padrão para renda) e aplicando os limites do Critério Brasil em salários
// mínimos. O resultado é uma estimativa de ordem de grandeza, sempre apresentada como tal.

const SALARIO_MINIMO_2022 = 1212; // vigente em jul/2022, data de referência do rendimento do Censo

// [id, rótulo, de (sm), até (sm)]
const CLASSES = [
  ['A1', 'Acima de 20 sm', 20, Infinity],
  ['A2', 'De 15 a 20 sm', 15, 20],
  ['B1', 'De 10 a 15 sm', 10, 15],
  ['B2', 'De 6 a 10 sm', 6, 10],
  ['C1', 'De 4 a 6 sm', 4, 6],
  ['C2', 'De 2 a 4 sm', 2, 4],
  ['D/E', 'Até 2 sm', 0, 2],
];

// Φ(z): função de distribuição da normal padrão (aproximação de Abramowitz & Stegun 7.1.26, erro < 1,5e-7)
function normalCdf(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** Participação (0–1) de cada classe: lognormal com a mediana e a média informadas (R$/mês) */
function participacoes(mediana, media) {
  if (!(mediana > 0) || !(media > 0)) return null;
  const sigma = Math.min(1.6, Math.max(0.25, Math.sqrt(2 * Math.log(Math.max(media / mediana, 1.0001)))));
  const mu = Math.log(mediana);
  const ate = (limite) => (limite === Infinity ? 1 : normalCdf((Math.log(limite * SALARIO_MINIMO_2022) - mu) / sigma));
  const de = (limite) => (limite <= 0 ? 0 : normalCdf((Math.log(limite * SALARIO_MINIMO_2022) - mu) / sigma));
  return CLASSES.map(([, , minimo, maximo]) => ate(maximo) - de(minimo));
}

/** { classes: [{ id, rotulo, qtd, pct }], total } com a soma exata dos domicílios (maiores restos) */
function estimarClasses({ rendaMediana, rendaMedia, domiciliosOcupados }) {
  const total = Number(domiciliosOcupados);
  const partes = participacoes(Number(rendaMediana), Number(rendaMedia));
  if (!partes || !(total > 0)) return null;
  const brutos = partes.map((p) => p * total);
  const qtd = brutos.map(Math.floor);
  let falta = total - qtd.reduce((a, b) => a + b, 0);
  brutos.map((b, i) => [b - Math.floor(b), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (falta > 0) { qtd[i] += 1; falta -= 1; } });
  return {
    total,
    classes: CLASSES.map(([id, rotulo], i) => ({ id, rotulo, qtd: qtd[i], pct: (qtd[i] / total) * 100 })),
  };
}

module.exports = { estimarClasses, CLASSES, SALARIO_MINIMO_2022 };
