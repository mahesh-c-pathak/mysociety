/* eslint-disable quote-props */
/* eslint-disable object-curly-spacing */
/* eslint-env node */
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import("eslint").Linter.Config} */
export default {
  root: true,
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.dev.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  ignorePatterns: ['lib/**', 'generated/**', 'node_modules/**'],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'quotes': ['error', 'double'],
    'import/no-unresolved': 0,
    'indent': ['error', 2],
  },
};
