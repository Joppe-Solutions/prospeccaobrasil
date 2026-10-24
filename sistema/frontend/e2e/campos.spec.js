import { test, expect } from '@playwright/test';
import { login, watchErrors, expectNoErrors } from './helpers.js';

test.beforeEach(async ({ page }) => { await login(page); });

test('máscaras: dinheiro com R$, milhar e vírgula; decimais e inteiros no cadastro do imóvel', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/imoveis');
  await page.getByRole('link', { name: 'Novo imóvel' }).click();
  const modal = page.locator('.modal');
  await modal.getByRole('button', { name: 'Próximo' }).click();
  await modal.locator('#wz-endereco').fill('Rua da Máscara, 10');
  await modal.locator('#wz-cidade').fill('Rio de Janeiro');
  await modal.getByRole('button', { name: 'Próximo' }).click();

  // Dimensões: decimal com vírgula; ponto digitado vira vírgula; inteiro ignora a vírgula
  const util = modal.locator('#wz-areaUtil');
  await util.pressSequentially('1234,56');
  await expect(util).toHaveValue('1.234,56');
  await util.fill('');
  await util.pressSequentially('45.5');
  await expect(util).toHaveValue('45,5');
  await modal.locator('#wz-vagas').pressSequentially('1,2abc');
  await expect(modal.locator('#wz-vagas')).toHaveValue('12');
  await modal.getByRole('button', { name: 'Próximo' }).click();

  // Termos: R$, separador de milhar ao digitar e centavos fixos ao sair do campo
  const aluguel = modal.locator('#wz-aluguel');
  await aluguel.pressSequentially('12345,6');
  await expect(aluguel).toHaveValue('R$ 12.345,6');
  await aluguel.blur();
  await expect(aluguel).toHaveValue('R$ 12.345,60');
  await aluguel.selectText();
  await page.keyboard.type('999');
  await expect(aluguel).toHaveValue('R$ 999');
  await aluguel.blur();
  await expect(aluguel).toHaveValue('R$ 999,00');
  await aluguel.fill('R$ 8.500,25');
  await expect(aluguel).toHaveValue('R$ 8.500,25');
  await modal.locator('#wz-condominio').pressSequentially('1500');
  await expect(modal.locator('#wz-condominio')).toHaveValue('R$ 1.500');
  await modal.locator('#wz-carenciaMeses').pressSequentially('6');
  await modal.getByRole('button', { name: 'Próximo' }).click();
  await modal.getByRole('button', { name: 'Próximo' }).click(); // vínculos
  await modal.getByRole('button', { name: 'Próximo' }).click(); // fotos
  await modal.getByRole('button', { name: /Cadastrar|Salvar/ }).click();

  // Valores chegam à API como números e voltam formatados
  const main = page.locator('#main-content');
  await expect(main).toContainText('R$ 8.500,25', { timeout: 10000 });
  await expect(main).toContainText('R$ 1.500,00');
  await expect(main).toContainText('45,5');
  await expectNoErrors(errors);
});

test('parceiros: consultor (CPF), advogado (OAB), corretor (CRECI-PF), imobiliária (CRECI-PJ) e indicador', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/parceiros');
  await page.getByRole('button', { name: /Novo parceiro/ }).click();
  const modal = page.locator('.modal');
  const tipo = modal.getByLabel('Tipo de parceiro');

  // consultor: CPF obrigatório, sem CRECI/OAB nem escolha de pessoa
  await expect(tipo).toHaveValue('consultor');
  await expect(modal.getByLabel(/^CPF/)).toBeVisible();
  await expect(modal.getByLabel(/CRECI|Número da OAB/)).toHaveCount(0);
  await expect(modal.getByLabel('Pessoa', { exact: true })).toHaveCount(0);
  await modal.getByLabel(/Nome completo/).fill('Ana Consultora');
  await modal.getByRole('button', { name: /Cadastrar/ }).click();
  await expect(modal).toContainText('Informe o CPF do consultor');
  await modal.getByLabel(/^CPF/).pressSequentially('11144477735');
  await modal.getByRole('button', { name: /Cadastrar/ }).click();
  const main = page.locator('#main-content');
  await expect(main).toContainText('Consultor · Pessoa física');

  // corretor: CRECI-PF; imobiliária: CRECI-PJ com CNPJ; advogado: OAB; indicador: escolhe a pessoa
  await page.getByRole('button', { name: /Novo parceiro/ }).click();
  await tipo.selectOption('corretor');
  await expect(modal.getByLabel(/^CRECI-PF/)).toBeVisible();
  await tipo.selectOption('imobiliaria');
  await expect(modal.getByLabel(/^CRECI-PJ/)).toBeVisible();
  await expect(modal.getByLabel(/^CNPJ/)).toBeVisible();
  await tipo.selectOption('advogado');
  await expect(modal.getByLabel(/CRECI/)).toHaveCount(0);
  await expect(modal.getByLabel(/Número da OAB/)).toBeVisible();
  await tipo.selectOption('indicador');
  await expect(modal.getByLabel(/CRECI|Número da OAB/)).toHaveCount(0);
  await expect(modal.getByLabel('Pessoa', { exact: true })).toBeVisible();

  await tipo.selectOption('imobiliaria');
  await modal.getByLabel(/Razão social/).fill('Imobiliária Exemplo Ltda');
  await modal.getByLabel(/^CRECI-PJ/).pressSequentially('9876');
  await modal.getByRole('button', { name: /Cadastrar/ }).click();
  await expect(main).toContainText('Imobiliária · Pessoa jurídica · CRECI-PJ RJ-9876');
  await expectNoErrors(errors);
});
