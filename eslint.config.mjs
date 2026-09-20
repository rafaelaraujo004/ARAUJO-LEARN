import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/** Regras do Next + TypeScript, com os ajustes que este projeto precisa. */
const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'src/generated/**',
      '.storage/**',
      '.pgdata/**',
      'tools/**',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Capas, avatares e vídeos vêm de URLs assinadas e temporárias:
      // `next/image` não consegue otimizá-las, então <img> é a escolha certa.
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
