const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'ios/**',
      'android/**',
      'sprites/**',
      'fonts/**',
      'phases/**',
      'spec/**',
      'supabase/functions/**', // Deno runtime; uses esm.sh URL imports
      'build/**', // generated artifacts (sprite atlas, gen db types, PBFs)
    ],
  },
]);
