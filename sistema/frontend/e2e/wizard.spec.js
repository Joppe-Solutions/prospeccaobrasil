import { test, expect } from '@playwright/test';
import { login, watchErrors, expectNoErrors } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('wizard de imóvel cria registro completo e lista exibe o novo código', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/imoveis');
  await page.getByRole('link', { name: 'Novo imóvel' }).click();

  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();

  // Etapa 1: identificação
  await modal.locator('#wz-titulo').fill('Imóvel Wizard E2E');
  await modal.getByRole('button', { name: 'Próximo' }).click();

  // Etapa 2: endereço (obrigatórios)
  await modal.locator('#wz-endereco').fill('Rua do Wizard, 100');
  await modal.locator('#wz-cidade').fill('Rio de Janeiro');
  // coordenadas copiadas do Google Maps: mapa e QR code usam exatamente este ponto
  await modal.locator('#wz-coordenadas').fill('-22.90680, -43.17290');
  await expect(modal).toContainText('Mapa e QR code da apresentação usarão exatamente este ponto');
  await modal.getByRole('button', { name: 'Próximo' }).click();

  // Etapa 3: dimensões — áreas dinâmicas somam na ABL, que segue editável
  await modal.getByLabel('Nome da área 1').fill('Térreo');
  await modal.getByLabel('Metragem da área 1 (m²)').fill('80');
  await modal.getByRole('button', { name: 'Adicionar área' }).click();
  await modal.getByLabel('Nome da área 2').fill('2º piso');
  await modal.getByLabel('Metragem da área 2 (m²)').fill('45.5');
  await expect(modal.locator('#wz-areaTotal')).toHaveValue('125,5');
  await modal.locator('#wz-areaTotal').fill('120');
  await expect(modal.getByRole('button', { name: 'Usar a soma' })).toBeVisible();
  await modal.getByRole('button', { name: 'Próximo' }).click();

  // Etapa 4: termos
  await modal.locator('#wz-aluguel').fill('8000');
  await modal.getByRole('button', { name: 'Próximo' }).click();

  // Etapa 5: vínculos (sem campos legados nem links manuais)
  await expect(modal.locator('#wz-googleMapsUrl, #wz-googleDriveUrl, #wz-telProprietario')).toHaveCount(0);
  await modal.getByRole('button', { name: 'Próximo' }).click();

  // Etapa 6: fotos com prévia; a primeira vira capa
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await modal.getByLabel('Selecionar fotos').setInputFiles([{ name: 'fachada.png', mimeType: 'image/png', buffer: png }, { name: 'interna.png', mimeType: 'image/png', buffer: png }]);
  await expect(modal.locator('.photo-grid li')).toHaveCount(2);
  await modal.getByRole('button', { name: 'Usar foto 2 como capa' }).click();
  await expect(modal.locator('.photo-grid li').nth(1)).toContainText('CAPA');
  await modal.getByRole('button', { name: 'Próximo' }).click();
  await expect(modal).toContainText('Revisar cadastro');
  await modal.getByRole('button', { name: /Cadastrar|Salvar/ }).click();

  // Abre o detalhe do imóvel criado, com áreas, fotos e link do Maps gerado
  const main = page.locator('#main-content');
  await expect(main).toContainText('Imóvel Wizard E2E', { timeout: 10000 });
  await expect(main).toContainText('2º piso');
  await expect(main).toContainText('Área Bruta Locável (ABL)');
  await expect(main.locator('.photo-grid li')).toHaveCount(2);
  await expect(main.getByRole('link', { name: /Ver no Google Maps/ })).toHaveAttribute('href', /query=-22\.9068%2C-43\.1729/);
  await expectNoErrors(errors);
});

test('wizard bloqueia avanço sem campos obrigatórios', async ({ page }) => {
  await page.goto('/imoveis');
  await page.getByRole('link', { name: 'Novo imóvel' }).click();
  const modal = page.locator('.modal');
  // Pula para etapa de endereço sem preencher → tenta avançar
  await modal.getByRole('button', { name: 'Próximo' }).click();
  await modal.getByRole('button', { name: 'Próximo' }).click();
  // Continua na etapa de endereço (obrigatórios faltando)
  await expect(modal).toContainText('Onde fica o imóvel');
  await page.keyboard.press('Escape');
});

test('wizard recusa coordenadas fora do formato ou do intervalo', async ({ page }) => {
  await page.goto('/imoveis');
  await page.getByRole('link', { name: 'Novo imóvel' }).click();
  const modal = page.locator('.modal');
  await modal.getByRole('button', { name: 'Próximo' }).click();
  await modal.locator('#wz-endereco').fill('Rua das Coordenadas, 1');
  await modal.locator('#wz-cidade').fill('Rio de Janeiro');
  for (const invalida of ['95, -43', '-22,9068, -43,17', 'abc']) {
    await modal.locator('#wz-coordenadas').fill(invalida);
    await expect(modal).toContainText('Formato inválido ou fora do intervalo');
    await modal.getByRole('button', { name: 'Próximo' }).click();
    await expect(modal).toContainText('Onde fica o imóvel'); // continua na etapa de endereço
  }
  await modal.locator('#wz-coordenadas').fill('');
  await modal.getByRole('button', { name: 'Próximo' }).click();
  await expect(modal).toContainText('Dimensões');
  await page.keyboard.press('Escape');
});

test('vínculos: cria proprietário na hora e, em passagem de ponto, pede o operador', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/imoveis/novo');
  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();
  await modal.locator('#wz-titulo').fill('Imóvel Vínculos E2E');
  await modal.locator('#wz-tipo').selectOption('passagem_ponto');
  const ate = async (n) => { for (let k = 0; k < n; k++) await modal.getByRole('button', { name: 'Próximo' }).click(); };
  await ate(1);
  await modal.locator('#wz-endereco').fill('Rua do Wizard, 100');
  await modal.locator('#wz-cidade').fill('Rio de Janeiro');
  await ate(3);
  await expect(modal.locator('#wz-vinc-proprietario, #wz-vinc-operador')).toHaveCount(1);

  // passagem de ponto: operador no lugar do proprietário
  await expect(modal.locator('#wz-vinc-proprietario')).toHaveCount(0);
  await modal.getByRole('button', { name: /novo operador/ }).click();
  await modal.locator('#nv-nome').fill('Operador Inline E2E');
  await modal.locator('#nv-marca').fill('Marca Inline');
  await modal.getByRole('button', { name: 'Cadastrar e selecionar' }).click();
  await expect(modal.locator('#wz-vinc-operador')).toHaveValue(/\d+/);
  await expect(modal.locator('#wz-vinc-operador option:checked')).toContainText('Operador Inline E2E');

  // locação: proprietário, com cadastro novo direto no formulário
  for (let k = 0; k < 4; k++) await modal.getByRole('button', { name: 'Voltar' }).click();
  await modal.locator('#wz-tipo').selectOption('locacao');
  await ate(4);
  await expect(modal.locator('#wz-vinc-operador')).toHaveCount(0);
  await modal.getByRole('button', { name: /novo proprietário/ }).click();
  await modal.getByRole('button', { name: 'Cadastrar e selecionar' }).click();
  await expect(modal).toContainText('Informe o nome');
  await modal.locator('#nv-nome').fill('Proprietário Inline E2E');
  await modal.getByRole('button', { name: 'Cadastrar e selecionar' }).click();
  await expect(modal.locator('#wz-vinc-proprietario option:checked')).toContainText('Proprietário Inline E2E');
  await expectNoErrors(errors);
});

test('endereço: mapa localiza o endereço e o marcador define as coordenadas', async ({ page }) => {
  const errors = watchErrors(page);
  await page.route('https://tile.openstreetmap.org/**', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG9sAAAAASUVORK5CYII=', 'base64') }));
  await page.route('**/api/imoveis/localizar?*', r => r.fulfill({ json: { lat: -22.9, lon: -43.28, fonte: 'OpenStreetMap', precisao: 'rua' } }));
  await page.goto('/imoveis/novo');
  const modal = page.locator('.modal');
  await modal.locator('#wz-titulo').fill('Imóvel Mapa E2E');
  await modal.getByRole('button', { name: 'Próximo' }).click();
  await modal.locator('#wz-endereco').fill('Av. Cônego Pascoal');
  await modal.locator('#wz-numero').fill('472');
  await modal.locator('#wz-cidade').fill('Rio de Janeiro');
  await modal.getByRole('button', { name: 'Localizar endereço no mapa' }).click();
  await expect(modal.locator('#wz-coordenadas')).toHaveValue('-22.900000, -43.280000');
  await expect(modal).toContainText('achou só a rua');
  // clicar no mapa reposiciona o marcador e atualiza o campo
  const mapa = modal.getByRole('application', { name: 'Mapa para marcar o ponto do imóvel' });
  await mapa.click({ position: { x: 90, y: 220 } });
  await expect(modal.locator('#wz-coordenadas')).not.toHaveValue('-22.900000, -43.280000');
  await expect(modal.locator('#wz-coordenadas')).toHaveValue(/^-22\.\d{6}, -43\.\d{6}$/);
  await expect(modal.locator('.mapa-ponto-pin')).toHaveCount(1);
  await expectNoErrors(errors);
});
