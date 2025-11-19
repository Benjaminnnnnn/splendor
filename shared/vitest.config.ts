import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['shared/**/*.test.ts', 'shared/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['shared/**/*.ts'],
      exclude: ['shared/**/*.test.ts', 'shared/**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@shared': './shared',
    },
  },
});
