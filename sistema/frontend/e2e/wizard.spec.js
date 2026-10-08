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
  await modal.getByRole('button', { name: 'Próximo' }).click();

  // Etapa 3: dimensões — áreas dinâmicas somam na ABL, que segue editável
  await modal.getByLabel('Nome da área 1').fill('Térreo');
  await modal.getByLabel('Metragem da área 1 (m²)').fill('80');
  await modal.getByRole('button', { name: 'Adicionar área' }).click();
  await modal.getByLabel('Nome da área 2').fill('2º piso');
  await modal.getByLabel('Metragem da área 2 (m²)').fill('45.5');
  await expect(modal.locator('#wz-areaTotal')).toHaveValue('125.5');
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
  await expect(main.getByRole('link', { name: /Ver no Google Maps/ })).toHaveAttribute('href', /google\.com\/maps\/search/);
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
