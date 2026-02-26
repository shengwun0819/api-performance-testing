'use strict';

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  overrides: [
    {
      // k6 測試腳本：k6 全域與 open()，ES modules
      files: ['load-test/tests/**/*.js'],
      env: {
        node: false,
        es2022: true,
      },
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
        open: 'readonly',
        console: 'readonly',
      },
      rules: {
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
  ],
  rules: {
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
};
