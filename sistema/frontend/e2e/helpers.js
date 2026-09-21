import { expect } from '@playwright/test';

export async function login(page) {
  await page.goto('/login');
  await page.fill('#login-email', 'admin@e2e.dev');
  await page.fill('#login-password', 'prospeccao123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

// Coleta erros de console e exceções de página (pega ReferenceError, etc).
export function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

export async function expectNoErrors(errors) {
  // Ignora falhas de rede esperadas (ex.: fonts externas offline)
  const relevant = errors.filter((e) => !/net::|Failed to load resource|favicon/i.test(e));
  expect(relevant, relevant.join('\n')).toEqual([]);
}
