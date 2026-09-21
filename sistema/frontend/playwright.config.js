import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8190',
    trace: 'retain-on-failure',
  },
  globalSetup: './e2e/global-setup.js',
  webServer: {
    command: 'node ../api/src/server.js',
    port: 8190,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: '8190',
      DATABASE_URL: 'file:./e2e.db',
      JWT_SECRET: 'e2e-secret',
      NODE_ENV: 'test',
      LOGIN_RATE_LIMIT: '1000',
    },
    cwd: '../api',
  },
});
