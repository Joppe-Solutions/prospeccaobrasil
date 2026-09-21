import { test, expect } from '@playwright/test';
import { login, watchErrors, expectNoErrors } from './helpers.js';

test('login inválido mostra erro', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/login');
  await page.fill('#login-email', 'admin@e2e.dev');
  await page.fill('#login-password', 'senhaerrada');
  await page.click('button[type="submit"]');
  await expect(page.locator('.alert.error')).toBeVisible();
  await expectNoErrors(errors);
});

test('login válido entra no dashboard e logout sai', async ({ page }) => {
  const errors = watchErrors(page);
  await login(page);
  await expect(page).toHaveURL('/');
  await expect(page.locator('nav')).toBeVisible();
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expectNoErrors(errors);
});

test('rota protegida redireciona para login sem token', async ({ page }) => {
  await page.goto('/imoveis');
  await expect(page).toHaveURL(/\/login/);
});
