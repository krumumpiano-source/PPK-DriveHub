// @ts-check
// Load test credentials from .env.test (gitignored — never committed to repo)
import { readFileSync } from 'fs';
import { defineConfig, devices } from '@playwright/test';

try {
  readFileSync('.env.test', 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) process.env[trimmed.slice(0, eqIdx).trim()] ??= trimmed.slice(eqIdx + 1).trim();
  });
} catch { /* .env.test not found — rely on env vars set externally */ }

export default defineConfig({
  globalSetup: './tests/global-setup.mjs',
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8788',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'th-TH',
  },
  projects: [
    // ── API / Functional tests (Chromium only) ───────────────────────
    {
      name: 'api-integration',
      testMatch: /api-integration\.test\.mjs/,
    },
    {
      name: 'qr-system',
      testMatch: /qr-system\.test\.mjs/,
    },
    {
      name: 'qr-hub-smoke',
      testMatch: /qr-hub-smoke\.test\.mjs/,
      use: { ...devices['Pixel 7'] },
    },
    // Runs ALL e2e specs (including ui-*.spec.mjs) on Desktop Chrome
    {
      name: 'e2e-chromium',
      testMatch: /e2e\/.*\.spec\.mjs/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Desktop cross-browser (UI tests only) ────────────────────────
    {
      name: 'desktop-firefox',
      testMatch: /e2e\/ui-.*\.spec\.mjs/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'desktop-edge',
      testMatch: /e2e\/ui-.*\.spec\.mjs/,
      use: { ...devices['Desktop Edge'] },
    },
    {
      name: 'desktop-safari',
      testMatch: /e2e\/ui-.*\.spec\.mjs/,
      use: { ...devices['Desktop Safari'] },
    },

    // ── Mobile devices ────────────────────────────────────────────────
    {
      name: 'mobile-android',
      testMatch: /e2e\/ui-.*\.spec\.mjs/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-iphone',
      testMatch: /e2e\/ui-.*\.spec\.mjs/,
      use: { ...devices['iPhone 15'] },
    },
    {
      name: 'mobile-iphone-se',
      testMatch: /e2e\/ui-.*\.spec\.mjs/,
      use: { ...devices['iPhone SE'] },
    },

    // ── Tablet devices ────────────────────────────────────────────────
    {
      name: 'tablet-ipad',
      testMatch: /e2e\/ui-.*\.spec\.mjs/,
      use: { ...devices['iPad Pro 11'] },
    },
    {
      name: 'tablet-android',
      testMatch: /e2e\/ui-.*\.spec\.mjs/,
      use: { ...devices['Galaxy Tab S4'] },
    },
  ],
  webServer: {
    command: 'npx wrangler pages dev ./frontend --d1 DB=4b18fad9-15f5-4741-bfa1-877fb34a8298 --port 8788',
    port: 8788,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
