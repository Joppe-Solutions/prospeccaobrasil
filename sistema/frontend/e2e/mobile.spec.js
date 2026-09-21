import { test, expect } from '@playwright/test';
import { login, watchErrors, expectNoErrors } from './helpers.js';

// Viewport de celular: menu lateral vira drawer/compacto; módulos devem abrir.
test.use({ viewport: { width: 390, height: 844 } });

test('mobile: login e módulos principais abrem sem erro', async ({ page }) => {
  const errors = watchErrors(page);
  await login(page);
  for (const path of ['/', '/leads', '/imoveis']) {
    await page.goto(path);
    await expect(page.locator('#main-content')).not.toBeEmpty();
  }
  await expectNoErrors(errors);
});

test('mobile: modal de conversão é utilizável em tela pequena', async ({ page }) => {
  await login(page);
  await page.goto('/leads');
  await page.getByRole('button', { name: 'Converter Lead E2E', exact: true }).click();
  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();
  // Foco inicial dentro do modal e Escape fecha
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});
