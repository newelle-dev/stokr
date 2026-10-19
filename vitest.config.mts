import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'lib/**/__tests__/**/*.{test,spec}.ts',
      'features/**/__tests__/**/*.{test,spec}.ts',
    ],
    exclude: ['**/*.integration.test.ts', 'supabase/tests/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
