import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/*/src/**/*.test.ts',
      'packages/*/src/**/*.spec.ts',
      'apps/docs/lib/**/*.test.ts',
      'benchmarks/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/*.d.ts', '**/dist/**', '**/node_modules/**'],
    },
    outputFile: process.env.CI ? { junit: 'test-results/junit.xml' } : undefined,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
  },
});
