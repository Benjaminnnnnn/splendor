import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    exclude: [
      ...configDefaults.exclude,
      'tests/**/*.e2e.test.{ts,tsx}',
      'playwright.config.ts'
    ]
  }
});
