import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.e2e\.test.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      command: 'cd client && npm run dev',
      url: 'http://localhost:3000',
      timeout: 120_000
    },
    {
      command: 'cd server && DATABASE_PATH=./data/splendor-test.db npm run dev',
      url: 'http://localhost:3001/health',
      timeout: 120_000
    }
  ]
});
