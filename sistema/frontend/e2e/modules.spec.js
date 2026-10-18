import { test, expect } from '@playwright/test';
import { login, watchErrors, expectNoErrors } from './helpers.js';

// label = título na barra superior; navLabel = nome do link na sidebar quando difere (itens com linha de apoio)
const MODULES = [
  { path: '/', label: 'Visão geral', marker: 'BEM-VINDO' },
  { path: '/financeiro', label: 'Financeiro', marker: null },
  { path: '/imoveis', label: 'Imóveis', navLabel: /^Imóveis/, marker: 'PB-E2E' },
  { path: '/empresas', label: 'Clientes', navLabel: /^Clientes/, marker: 'Empresa E2E' },
  { path: '/parceiros', label: 'Consultores', navLabel: /^Consultores/, marker: 'Parceiro E2E' },
  { path: '/leads', label: 'Leads', navLabel: /^Leads/, marker: 'Lead E2E' },
  { path: '/proprietarios', label: 'Proprietários e operadores', marker: 'Proprietário E2E' },
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

test('detalhe do imóvel abre e apresenta para cliente compatível', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/imoveis');
  await page.getByText('PB-E2E').first().click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#main-content')).toContainText(/PB-E2E|Imóvel E2E/);
  // clientes compatíveis pelas premissas; apresentar vira uma ação da operação
  const sugestoes = page.locator('.match-clientes');
  await expect(sugestoes).toContainText('Rede Méier E2E');
  await expect(sugestoes).not.toContainText('Empresa E2E');
  await page.getByRole('button', { name: 'Apresentar para Rede Méier E2E' }).click();
  await expect(page.getByRole('row', { name: /Rede Méier E2E/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apresentar para Rede Méier E2E' })).toHaveCount(0);
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

test('menu: Institucional é só um grupo (sem página própria) e módulos removidos redirecionam', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/imoveis');
  const nav = page.locator('nav');
  await expect(nav.getByRole('link', { name: 'Site institucional' })).toHaveAttribute('href', 'https://prospeccaobrasil.com.br');
  await expect(nav.getByRole('link', { name: /^Institucional$/ })).toHaveCount(0); // o rótulo do grupo não é link
  await nav.getByText('Institucional', { exact: true }).click();
  await expect(page).toHaveURL(/\/imoveis$/);
  for (const antigo of ['/institucional', '/diretrizes', '/propostas']) {
    await page.goto(antigo);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.topbar-path strong')).toHaveText('Visão geral');
  }
  await expect(nav.getByRole('link', { name: /Diretrizes|Carta modelo/ })).toHaveCount(0);
  await expectNoErrors(errors);
});

test('ações das operações: acompanhamento da proposta', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/oportunidades');
  await page.getByRole('button', { name: 'Novo relacionamento' }).click();
  const modal = page.locator('.modal');
  await expect(modal.locator('#op-imovel option', { hasText: 'PB-E2E' })).toHaveCount(1);
  await modal.locator('#op-imovel').selectOption(await modal.locator('#op-imovel option', { hasText: 'PB-E2E' }).getAttribute('value'));
  await modal.locator('#op-empresa').selectOption({ label: 'Empresa E2E' });
  await modal.getByRole('button', { name: 'Criar oportunidade' }).click();
  await expect(modal).toHaveCount(0);
  const linha = page.getByRole('row', { name: /Empresa E2E/ });
  await expect(linha).toContainText('Sem proposta');
  await linha.getByRole('button', { name: /Editar oportunidade/ }).click();
  await modal.locator('#op-prop-status').selectOption('enviada');
  await modal.locator('#op-prop-valor').fill('18000');
  await modal.locator('#op-prop-retorno').fill('2026-12-10');
  await modal.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(modal).toHaveCount(0);
  await expect(linha).toContainText('Enviada');
  await expect(linha).toContainText('R$ 18.000,00');
  await expect(linha).toContainText('retorno 10/12/2026');
  await expect(linha.getByRole('combobox')).toHaveValue('proposta');
  await page.getByLabel('Filtrar proposta').selectOption('enviada');
  await expect(page.getByRole('row', { name: /Empresa E2E/ })).toBeVisible();
  await expectNoErrors(errors);
});

test('exclusões pela tela: imóvel no detalhe e cliente na lista (admin)', async ({ page }) => {
  const errors = watchErrors(page);
  const api = (method, url, body) => page.evaluate(async ([m, u, b]) => (await fetch(u, { method: m, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('pb_token')}` }, body: b ? JSON.stringify(b) : undefined })).json(), [method, url, body]);
  const imovel = await api('POST', '/api/imoveis', { codigo: 'PB-DEL', endereco: 'Rua Excluir E2E', cidade: 'Rio de Janeiro' });
  await page.goto(`/imoveis/${imovel.id}`);
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.locator('.modal')).toContainText('não podem ser recuperados');
  await page.getByRole('button', { name: 'Excluir definitivamente' }).click();
  await expect(page).toHaveURL(/\/imoveis$/);
  await expect(page.getByText('PB-DEL')).toHaveCount(0);

  await api('POST', '/api/empresas', { nome: 'Cliente Excluir E2E' });
  await page.goto('/empresas');
  await page.getByRole('button', { name: 'Excluir Cliente Excluir E2E' }).click();
  await page.locator('.modal').getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByRole('row', { name: /Cliente Excluir E2E/ })).toHaveCount(0);
  await expectNoErrors(errors);
});
