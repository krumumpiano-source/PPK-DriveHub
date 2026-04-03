// @ts-check
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
