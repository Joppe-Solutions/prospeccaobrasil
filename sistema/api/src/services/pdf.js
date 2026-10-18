// PDF gerado no servidor com o Chromium (Playwright): o documento sai em A4 exato, uma folha por página,
// em qualquer navegador ou impressora. Imprimir pela página depende do navegador (Safari e Firefox
// ignoram o tamanho de página do CSS e partem cada folha em duas); o PDF não.
const fs = require('fs');
const path = require('path');

// Navegador instalado pelo deploy em /opt/prospeccao-sistema/.browsers; localmente, o cache padrão do Playwright
const PASTA = path.join(__dirname, '..', '..', '.browsers');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(PASTA)) process.env.PLAYWRIGHT_BROWSERS_PATH = PASTA;

let navegador = null;
let fila = Promise.resolve();

async function abrir() {
  if (navegador?.isConnected()) return navegador;
  const { chromium } = require('playwright-core');
  navegador = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  navegador.on('disconnected', () => { navegador = null; });
  return navegador;
}

/** Renderiza a URL (servida por este mesmo processo) em PDF. Um por vez, para não sobrecarregar a VPS. */
function gerarPdf(url, { timeout = 30000 } = {}) {
  const tarefa = fila.then(async () => {
    const contexto = await (await abrir()).newContext();
    try {
      const pagina = await contexto.newPage();
      await pagina.goto(url, { waitUntil: 'networkidle', timeout });
      await pagina.evaluate(() => document.fonts?.ready);
      return await pagina.pdf({ preferCSSPageSize: true, printBackground: true });
    } finally {
      await contexto.close().catch(() => {});
    }
  });
  fila = tarefa.catch(() => {});
  return tarefa;
}

async function fechar() { if (navegador) await navegador.close().catch(() => {}); navegador = null; }

module.exports = { gerarPdf, fechar };
