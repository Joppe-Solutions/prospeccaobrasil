// Censo Demográfico 2022 (IBGE) por município e por bairro, a partir dos "Agregados por
// bairros/municípios" oficiais. O arquivo é gerado por scripts/build-censo2022.py.
const path = require('path');

const FAIXAS = ['0–4', '5–9', '10–14', '15–19', '20–24', '25–29', '30–39', '40–49', '50–59', '60–69', '70+'];
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

let dados;
const base = () => (dados ||= require(path.join(__dirname, '..', 'data', 'censo2022.json')));

function registro(r) {
  if (!r) return null;
  const [nome, areaKm2, populacao, domicilios, domiciliosOcupados, moradoresPorDomicilio, domiciliosVagos, usoOcasional, homens, mulheres, ...resto] = r;
  const faixas = resto.slice(0, FAIXAS.length);
  const [responsaveis, rendaMedia, rendaMediana] = resto.slice(FAIXAS.length);
  return {
    nome, areaKm2, populacao, domicilios, domiciliosOcupados, moradoresPorDomicilio, domiciliosVagos, usoOcasional,
    homens, mulheres, faixas, responsaveis, rendaMedia, rendaMediana,
    densidade: populacao && areaKm2 ? populacao / areaKm2 : null,
  };
}

const UF_ID = { AC: 12, AL: 27, AP: 16, AM: 13, BA: 29, CE: 23, DF: 53, ES: 32, GO: 52, MA: 21, MT: 51, MS: 50, MG: 31, PA: 15, PB: 25, PR: 41, PE: 26, PI: 22, RJ: 33, RN: 24, RS: 43, RO: 11, RR: 14, SC: 42, SP: 35, SE: 28, TO: 17 };
// Código IBGE do município a partir de nome + UF, sem chamada externa
function codigoMunicipio(nome, uf) {
  const prefixo = String(UF_ID[String(uf || '').toUpperCase()] || '');
  const alvo = norm(nome);
  if (!prefixo || !alvo) return null;
  return Object.keys(base().municipios).find((cd) => cd.startsWith(prefixo) && norm(base().municipios[cd][0]) === alvo) || null;
}

const municipio = (codigo) => registro(base().municipios[String(codigo)]);

// O bairro do cadastro é texto livre: casa por nome normalizado e, sem igualdade, só aceita
// um "contém" quando ele é único (evita trocar "Barra" por "Barra da Tijuca" ou "Barra de Guaratiba").
function bairro(codigoMunicipio, nome) {
  const lista = base().bairros[String(codigoMunicipio)] || [];
  const alvo = norm(nome);
  if (!alvo || !lista.length) return null;
  const exato = lista.find((b) => norm(b[0]) === alvo);
  if (exato) return registro(exato);
  const parecidos = lista.filter((b) => norm(b[0]).includes(alvo) || alvo.includes(norm(b[0])));
  return parecidos.length === 1 ? registro(parecidos[0]) : null;
}

const temBairros = (codigoMunicipio) => Boolean(base().bairros[String(codigoMunicipio)]?.length);

module.exports = { codigoMunicipio, municipio, bairro, temBairros, FAIXAS, FONTE: 'IBGE — Censo Demográfico 2022 (Agregados por bairros e municípios; rendimento do responsável pelo domicílio)' };
