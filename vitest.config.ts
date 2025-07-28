import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@app': resolve(__dirname, './app'),
      '@lib': resolve(__dirname, './lib'),
      '@store': resolve(__dirname, './store'),
      '@rules': resolve(__dirname, './rules'),
      '@ai': resolve(__dirname, './ai'),
      '@tests': resolve(__dirname, './__tests__'),
      '@components': resolve(__dirname, './components'),
    },
  },
});
