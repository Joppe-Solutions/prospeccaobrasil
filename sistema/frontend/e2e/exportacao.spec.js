import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { login } from './helpers.js';

test('exportações respeitam a busca e geram CSV, XLSX e PDF', async ({ page }) => {
  await login(page);
  await page.goto('/imoveis');
  await page.getByPlaceholder('Buscar imóvel, código ou bairro...').fill('PB-E2E');
  for (const [formato, ext] of [['CSV', 'csv'], ['XLSX', 'xlsx'], ['PDF', 'pdf']]) {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: formato, exact: true }).click();
    const arquivo = await download;
    expect(arquivo.suggestedFilename()).toBe(`imoveis.${ext}`);
    const bytes = await readFile(await arquivo.path());
    if (formato === 'CSV') {
      const csv = bytes.toString('utf8');
      expect(csv).toContain('PB-E2E');
      expect(csv).toContain('Documentação');
      expect(csv.trim().split(/\r?\n/)).toHaveLength(2);
    } else if (formato === 'XLSX') expect(bytes.subarray(0, 2).toString()).toBe('PK');
    else expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  }
});

test('cadastro de executivo identifica o campo como Qualificação', async ({ page }) => {
  await login(page);
  await page.goto('/executivos-comerciais');
  await page.getByRole('button', { name: 'Novo executivo comercial' }).first().click();
  await expect(page.getByLabel('Qualificação')).toBeVisible();
});
