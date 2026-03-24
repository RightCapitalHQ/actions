import eslintConfigRightcapital from '@rightcapital/eslint-config';
import { globalIgnores } from 'eslint/config';

const { defineConfig } = eslintConfigRightcapital.utils;

export default defineConfig(
  globalIgnores(['**/dist/', '**/lib/', '.nx/']),
  ...eslintConfigRightcapital.configs.recommended,
  {
    files: ['*/src/**/*.ts'],
    ignores: ['scripts/**'],
    extends: [...eslintConfigRightcapital.configs.node],
  },
  {
    files: ['**/*.config.{mjs,mts,js,ts}', 'scripts/**/*.ts'],
    extends: [
      ...eslintConfigRightcapital.configs.node,
      ...eslintConfigRightcapital.configs.script,
    ],
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        { devDependencies: true },
      ],
      'no-restricted-exports': 'off',
    },
  },
);
