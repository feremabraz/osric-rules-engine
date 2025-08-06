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
      '@osric': resolve(__dirname, './osric'),
      '@osric/core': resolve(__dirname, './osric/core'),
      '@osric/types': resolve(__dirname, './osric/types'),
      '@osric/utils': resolve(__dirname, './osric/utils'),
      '@osric/rules': resolve(__dirname, './osric/rules'),
      '@osric/commands': resolve(__dirname, './osric/commands'),
      '@osric/entities': resolve(__dirname, './osric/entities'),
    },
  },
});
