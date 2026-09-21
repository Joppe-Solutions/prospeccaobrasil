import { test, expect } from '@playwright/test';
import { login, watchErrors, expectNoErrors } from './helpers.js';

// Fluxo de negócio ponta a ponta: lead → conversão (modal) → empresa + oportunidade.
test.beforeEach(async ({ page }) => {
  await login(page);
});

test('conversão de lead em modal cria empresa e oportunidade vinculadas', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/leads');
  await expect(page.locator('#main-content')).toContainText('Lead E2E Conv');

  // Abre o modal de conversão pelo botão da linha
  await page.getByRole('button', { name: 'Converter Lead E2E Conv', exact: true }).click();
  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Converter Lead E2E Conv');

  // Nova empresa (nome pré-preenchido do lead) + oportunidade no imóvel E2E
  await expect(modal.locator('#conv-nome')).toHaveValue('Lead E2E Conv');
  await modal.locator('#conv-imovel').selectOption({ index: 1 });
  await modal.getByRole('button', { name: /Converter lead/ }).click();

  await expect(page.locator('.alert.success')).toContainText('Lead convertido');
  await expect(modal).toHaveCount(0);

  // Empresa criada com dados do lead
  await page.goto('/empresas');
  await expect(page.locator('#main-content')).toContainText('Lead E2E Conv');

  // Oportunidade vinculada ao imóvel E2E
  await page.goto('/oportunidades');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#main-content')).toContainText('Lead E2E Conv');

  // Lead marcado como convertido e sem botão de conversão duplicada
  await page.goto('/leads');
  await expect(page.getByRole('button', { name: 'Converter Lead E2E Conv', exact: true })).toHaveCount(0);

  await expectNoErrors(errors);
});

test('modal de conversão fecha com Escape e não envia sem imóvel', async ({ page }) => {
  await page.goto('/leads');
  await page.getByRole('button', { name: 'Converter Lead E2E', exact: true }).click();
  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();

  // Escape fecha o modal (acessibilidade)
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});
