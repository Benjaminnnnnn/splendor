import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    exclude: [
      ...configDefaults.exclude,
      'tests/**/*.e2e.{ts,tsx}',
      'tests/betting.e2e.test.ts',
      'tests/betting.integration.test.ts',
      'playwright.config.ts'
    ]
  }
});
