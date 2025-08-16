import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    globals: true,
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
    },
  },
  resolve: {
    alias: {
      '@tests': resolve(__dirname, './__tests__'),
    },
  },
});
