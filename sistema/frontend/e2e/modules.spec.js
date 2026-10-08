import { test, expect } from '@playwright/test';
import { login, watchErrors, expectNoErrors } from './helpers.js';

// label = título na barra superior; navLabel = nome do link na sidebar quando difere (itens com linha de apoio)
const MODULES = [
  { path: '/', label: 'Visão geral', marker: 'BEM-VINDO' },
  { path: '/institucional', label: 'Institucional', marker: 'Atuação e serviços' },
  { path: '/diretrizes', label: 'Diretrizes', marker: 'Diretrizes de expansão' },
  { path: '/propostas', label: 'Propostas Comerciais', navLabel: 'Carta modelo de Proposta Comercial', marker: null },
  { path: '/financeiro', label: 'Financeiro', marker: null },
  { path: '/imoveis', label: 'Imóveis', navLabel: /^Imóveis/, marker: 'PB-E2E' },
  { path: '/empresas', label: 'Clientes', navLabel: /^Clientes/, marker: 'Empresa E2E' },
  { path: '/demandas', label: 'Demandas', navLabel: /^Demandas/, marker: 'Demandas de Expansão' },
  { path: '/parceiros', label: 'Consultores', navLabel: /^Consultores/, marker: 'Parceiro E2E' },
  { path: '/leads', label: 'Leads', navLabel: /^Leads/, marker: 'Lead E2E' },
  { path: '/proprietarios', label: 'Proprietários', marker: 'Proprietário E2E' },
  { path: '/documentos', label: 'Documentação', marker: null },
  { path: '/glossario', label: 'Glossário de Varejo', marker: 'Glossário de Varejo' },
  { path: '/inteligencia', label: 'Inteligência de Mercado', marker: 'Relatórios por imóvel' },
  { path: '/benchmark', label: 'Benchmark', marker: 'Rental rate' },
  { path: '/modelos-contratos', label: 'Modelos de contratos', marker: 'Biblioteca de modelos' },
  { path: '/oportunidades', label: 'Ações das operações', marker: null },
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
    await page.locator('nav').getByRole('link', { name: mod.navLabel || mod.label, exact: true }).first().click();
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

test('inteligência: gera o relatório de um imóvel pela lista', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/inteligencia');
  const main = page.locator('#main-content');
  await main.getByRole('button', { name: /Gerar relatório do imóvel PB-E2E/ }).click();
  await expect(main.getByRole('button', { name: /Atualizar relatório do imóvel PB-E2E/ })).toBeVisible({ timeout: 15000 });
  await expect(main.getByRole('link', { name: 'Abrir relatório' }).first()).toHaveAttribute('href', /\/inteligencia\/\d+\?token=/);
  await expectNoErrors(errors);
});

test('modelos de contrato: admin cadastra e abre o link', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/modelos-contratos');
  await page.getByRole('button', { name: 'Novo modelo' }).click();
  await page.getByLabel('Nome do modelo').fill('Contrato de locação E2E');
  await page.getByLabel('Link do arquivo').fill('https://example.com/locacao.docx');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.locator('#main-content')).toContainText('Contrato de locação E2E');
  await expect(page.locator('#main-content').getByRole('link', { name: 'Abrir' })).toHaveAttribute('href', 'https://example.com/locacao.docx');
  await expectNoErrors(errors);
});
