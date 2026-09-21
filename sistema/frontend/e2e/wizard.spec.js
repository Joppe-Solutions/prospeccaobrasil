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

  // Etapa 3: dimensões
  await modal.locator('#wz-areaTotal').fill('120');
  await modal.getByRole('button', { name: 'Próximo' }).click();

  // Etapa 4: termos
  await modal.locator('#wz-aluguel').fill('8000');
  await modal.getByRole('button', { name: 'Próximo' }).click();

  // Etapa 5: vínculos → revisão
  await modal.getByRole('button', { name: 'Próximo' }).click();
  await expect(modal).toContainText('Revisar cadastro');
  await modal.getByRole('button', { name: /Cadastrar|Salvar/ }).click();

  // Volta para a lista com o imóvel criado
  await expect(page.locator('#main-content')).toContainText('Imóvel Wizard E2E', { timeout: 10000 });
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
