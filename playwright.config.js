// @ts-check
// Load test credentials from .env.test (gitignored — never committed to repo)
const { readFileSync } = require('fs');
try {
  readFileSync('.env.test', 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) process.env[trimmed.slice(0, eqIdx).trim()] ??= trimmed.slice(eqIdx + 1).trim();
  });
} catch { /* .env.test not found — rely on env vars set externally */ }

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  globalSetup: './tests/global-setup.mjs',
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8788',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'th-TH',
  },
  projects: [
    {
      name: 'api-integration',
      testMatch: /api-integration\.test\.mjs/,
    },
    {
      name: 'qr-system',
      testMatch: /qr-system\.test\.mjs/,
    },
    {
      name: 'e2e-chromium',
      testMatch: /e2e\/.*\.spec\.mjs/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx wrangler pages dev ./frontend --d1 DB=4b18fad9-15f5-4741-bfa1-877fb34a8298 --port 8788',
    port: 8788,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
