import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { renderInteligencia } = require('../../api/src/templates/inteligencia');
const censo = require('../../api/src/services/censo2022');
const { mapa } = require('../../api/src/services/demografia');
const setores = require('../../api/src/services/setores');

// Garantia de impressão: cada folha é uma página A4 paisagem exata; nunca folha vazia, nunca conteúdo que
// estoura a folha, mesmo quando faltam bairro, Censo ou entorno.
const geo = { lat: -22.8776, lon: -43.4648, fonte: 'Google Maps', precisao: 'endereco' };
const imovel = { codigo: 'PB-IMP', titulo: 'Loja de teste de impressão com um título bastante longo para verificar o corte do texto', endereco: 'Av. Cônego Vasconcelos', numero: '423', bairro: 'Bangu', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'locacao', categoria: 'loja', status: 'disponivel', areaTotal: 156, areaUtil: 126, aluguel: 25000, condominio: 840, iptu: 654, cdu: 30000, peDireito: 4, frenteImovel: 5.2, googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=-22.8776%2C-43.4648', fotos: [] };
const longo = 'Texto longo para forçar o limite de caracteres das listas e verificar que nada estoura a folha impressa. '.repeat(4);
const analise = { score: 74, resumo: longo, criadoEm: new Date('2026-10-20'), modelo: 'triagem-interna', conteudoJson: JSON.stringify({ pontosFortes: Array(9).fill(longo), pontosAtencao: Array(9).fill(longo), segmentosRecomendados: Array(12).fill('Segmento de exemplo'), recomendacao: longo, aviso: longo }) };
const serie = (base, g) => Object.fromEntries([2019, 2020, 2021, 2024, 2025, 2026, 2028, 2030].map((a, i) => [a, Math.round(base * (1 + g) ** (i - 5))]));
const municipio = { nome: 'Rio de Janeiro (RJ)', anos: [2026, 2028, 2030], serie: serie(6731133, 0.0003), tgca: 0.00026, anoBase: 2026 };
const uf = { nome: 'Rio de Janeiro', anos: [2026, 2028, 2030], serie: serie(17400000, 0.002), tgca: 0.002, anoBase: 2026 };
const linhas = ['Shoppings e lojas de departamento', 'Supermercados e conveniência', 'Alimentação (restaurantes, bares, cafés)', 'Farmácias e saúde', 'Bancos e serviços financeiros', 'Moda, calçados e acessórios', 'Educação', 'Academias', 'Hotéis', 'Estacionamentos', 'Outras lojas e serviços'].map((rotulo, n) => ({ rotulo, r500: 3 + n * 2, r1000: 8 + n * 5 }));
const entorno = {
  linhas, total500: 120, total1000: 340, consultadoEm: Date.now(),
  transporte: [{ rotulo: 'Pontos de ônibus', r500: 8, r1000: 21 }, { rotulo: 'Estações de metrô, trem ou VLT', r500: 1, r1000: 3 }, { rotulo: 'Terminais de barcas', r500: 0, r1000: 0 }],
  destaques: ['Estação', 'Shopping', 'Supermercado', 'Banco', 'Farmácia', 'Hospital', 'Universidade'].map((rotulo, n) => ({ rotulo, nome: `Equipamento de exemplo número ${n + 1} com nome extenso`, dist: 80 + n * 60 })),
  naRua: Array.from({ length: 10 }, (_, n) => ({ nome: `Estabelecimento vizinho ${n + 1}`, categoria: 'Outras lojas e serviços', dist: 30 })),
  via: { nome: 'Avenida Cônego Vasconcelos', tipo: 'Via arterial principal', faixas: '3', maoUnica: 'Mão dupla', velocidade: '60 km/h' },
};
const censoCompleto = { municipio: censo.municipio(3304557), bairro: censo.bairro(3304557, 'Bangu'), raio: setores.raio(geo.lat, geo.lon, 1000), temBairros: true };
const base = { municipio, uf, geo, mapa: mapa(geo, { z: 15, cols: 4, rows: 4 }) };
const CENARIOS = {
  completo: { ...base, censo: censoCompleto, entorno },
  'sem entorno': { ...base, censo: censoCompleto, entorno: null },
  'só bairro (sem setores)': { ...base, censo: { ...censoCompleto, raio: null }, entorno },
  'bairro não identificado': { ...base, censo: { ...censoCompleto, bairro: null, raio: null }, entorno },
  'sem Censo': { ...base, censo: null, mapa: null, entorno },
  'sem nenhum dado externo': null,
};

for (const [nome, demo] of Object.entries(CENARIOS)) {
  test(`inteligência impressa (${nome}): uma página A4 paisagem por folha, sem vazias nem estouro`, async ({ page }) => {
    await page.route('**/*', (r) => (new URL(r.request().url()).pathname === '/' ? r.fulfill({ contentType: 'text/html', body: renderInteligencia(imovel, analise, demo) }) : r.abort()));
    await page.goto('http://impressao.test/');
    await page.emulateMedia({ media: 'print' });

    const folhas = await page.evaluate(() => [...document.querySelectorAll('.sheet')].map((s) => {
      const inner = s.querySelector('.sheet-inner') || s;
      const r = s.getBoundingClientRect();
      const filhos = [...inner.querySelectorAll('.page-body, .page-foot, .page-top')];
      const limite = inner.getBoundingClientRect().bottom;
      return {
        titulo: (s.querySelector('h2.sec')?.innerText || 'Capa').replace(/\n/g, ' '),
        larguraMm: (r.width * 25.4) / 96, alturaMm: (r.height * 25.4) / 96,
        estouroV: inner.scrollHeight - inner.clientHeight, estouroH: inner.scrollWidth - inner.clientWidth,
        passouDoRodape: filhos.some((f) => f.getBoundingClientRect().bottom > limite + 1),
        // blocos do corpo empilhados sem sobreposição e sem texto vazando para fora do próprio bloco
        sobrepostos: (() => { const b = [...(s.querySelector('.page-body')?.children || [])].map((e) => e.getBoundingClientRect()).filter((x) => x.height); return b.some((x, k) => k && b[k - 1].bottom > x.top + 1); })(),
        vazando: [...s.querySelectorAll('.page-body > *, .page-body .col, .page-body .cols2')].filter((e) => getComputedStyle(e).overflowY === 'visible' && e.scrollHeight > e.clientHeight + 2).map((e) => e.className).join(', '),
        vazia: !s.classList.contains('cover') && (s.querySelector('.page-body')?.innerText || '').trim().length < 20,
      };
    }));
    expect(folhas.length).toBeGreaterThanOrEqual(6);
    for (const f of folhas) {
      expect(f.larguraMm, `${f.titulo}: largura`).toBeCloseTo(297, 0);
      expect(f.alturaMm, `${f.titulo}: altura`).toBeLessThanOrEqual(210);
      expect(f.estouroV, `${f.titulo}: conteúdo passa da folha`).toBeLessThanOrEqual(1);
      expect(f.estouroH, `${f.titulo}: conteúdo passa da largura`).toBeLessThanOrEqual(1);
      expect(f.passouDoRodape, `${f.titulo}: bloco ultrapassa o rodapé`).toBe(false);
      expect(f.vazia, `${f.titulo}: folha vazia`).toBe(false);
      expect(f.sobrepostos, `${f.titulo}: blocos sobrepostos`).toBe(false);
      expect(f.vazando, `${f.titulo}: texto vazando do bloco`).toBe('');
    }

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const texto = pdf.toString('latin1');
    expect((texto.match(/\/Type\s*\/Page[^s]/g) || []).length, 'páginas do PDF = folhas do documento').toBe(folhas.length);
    const [largura, altura] = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(texto).slice(1).map(Number);
    expect(largura).toBeCloseTo(841.89, 0); // A4 deitada: 297 x 210 mm
    expect(altura).toBeCloseTo(595.28, 0);
  });
}
