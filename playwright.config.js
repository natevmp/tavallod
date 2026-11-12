import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  timeout: 30000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/tavallod/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-phone', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
    { name: 'webkit-phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' } },
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:4173/tavallod/',
    reuseExistingServer: !process.env.CI,
  },
});
