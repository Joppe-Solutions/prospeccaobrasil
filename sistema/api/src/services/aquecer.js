// Pré-carrega, em segundo plano, o que a apresentação e o relatório precisam do endereço
// (coordenadas, imagem do mapa e entorno). Assim a primeira abertura pelo cliente já sai
// completa, em vez de depender de serviços externos lentos naquele momento.
const { geocode, mapaEstatico, usaGoogle } = require('./mapas');
const { entorno } = require('./entorno');

function aquecerLocalizacao(imovel) {
  if (process.env.NODE_ENV === 'test') return; // testes não chamam serviços externos
  setImmediate(async () => {
    try {
      const geo = await geocode(imovel);
      if (!geo) return;
      if (usaGoogle()) await mapaEstatico(geo);
      await entorno(geo, imovel);
    } catch (e) { console.error('Pré-carga da localização:', e.message); }
  });
}

module.exports = { aquecerLocalizacao };
