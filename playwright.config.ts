import { defineConfig, devices } from '@playwright/test';

// Browsers live project-locally (node_modules/playwright-core/.local-browsers) so e2e runs
// do not depend on a writable user profile. Install with `npm run test:e2e:install`.
if (!process.env['CI']) process.env['PLAYWRIGHT_BROWSERS_PATH'] ??= '0';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4300',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm.cmd run start -- --host 127.0.0.1 --port 4300',
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
