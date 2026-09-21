import { test, expect } from '@playwright/test';
import { login, watchErrors, expectNoErrors } from './helpers.js';

const MODULES = [
  { path: '/', label: 'Visão geral', marker: 'BEM-VINDO' },
  { path: '/imoveis', label: 'Imóveis', marker: 'PB-E2E' },
  { path: '/financeiro', label: 'Financeiro', marker: null },
  { path: '/empresas', label: 'Clientes', navLabel: 'Clientes', marker: 'Empresa E2E' },
  { path: '/proprietarios', label: 'Proprietários', marker: 'Proprietário E2E' },
  { path: '/parceiros', label: 'Parceiros comerciais', marker: 'Parceiro E2E' },
  { path: '/leads', label: 'Leads', marker: 'Lead E2E' },
  { path: '/documentos', label: 'Documentação', marker: null },
  { path: '/inteligencia', label: 'Inteligência de mercado', marker: null },
  { path: '/oportunidades', label: 'Relacionamentos comerciais', marker: null },
  { path: '/perfil', label: 'Perfil', marker: null },
  { path: '/usuarios', label: 'Usuários', marker: 'Admin E2E' },
  { path: '/configuracoes', label: 'Configurações', marker: 'Parâmetros do sistema' },
];

test.beforeEach(async ({ page }) => {
  await login(page);
});

for (const mod of MODULES) {
  test(`módulo ${mod.label} carrega sem erros`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(mod.path);
    await expect(page.locator('.topbar-path strong')).toHaveText(mod.label);
    await expect(page.locator('#main-content')).not.toBeEmpty();
    if (mod.marker) {
      await expect(page.locator('#main-content')).toContainText(mod.marker);
    }
    await page.waitForLoadState('networkidle');
    await expectNoErrors(errors);
  });
}

test('navegação pela sidebar visita todos os módulos', async ({ page }) => {
  const errors = watchErrors(page);
  for (const mod of MODULES.filter((m) => m.path !== '/')) {
    await page.locator('nav').getByRole('link', { name: mod.navLabel || mod.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(mod.path.replace('/', '\\/') + '$'));
    await expect(page.locator('.topbar-path strong')).toHaveText(mod.label);
  }
  await page.waitForLoadState('networkidle');
  await expectNoErrors(errors);
});

test('detalhe do imóvel abre', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/imoveis');
  await page.getByText('PB-E2E').first().click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#main-content')).toContainText(/PB-E2E|Imóvel E2E/);
  await expectNoErrors(errors);
});
