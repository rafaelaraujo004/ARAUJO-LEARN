import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    globals: false,
    env: {
      // Determinístico e isolado: os testes nunca tocam um banco ou segredo reais.
      NODE_ENV: 'test',
      AUTH_SECRET: 'segredo-de-teste-com-tamanho-suficiente-0123456789',
      DATABASE_URL: 'postgresql://test:test@localhost:5433/test',
      APP_URL: 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
      'server-only': path.resolve(process.cwd(), 'tests/stubs/server-only.ts'),
    },
  },
});
