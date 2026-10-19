// Configuração mínima do ESLint (formato "flat config") para TypeScript em ESM.
// Regras recomendadas do ESLint e do typescript-eslint, sem checagem por tipos (rápido e simples).
// Uso: npm run lint
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['generated/**', 'node_modules/**', 'uploads/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      // Nomes começando com "_" marcam algo ignorado de propósito (ex.: _res, _omit).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
);
