import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Test and setup files use Jest mocks: `as any` casts on mock return values,
  // `require()` to grab mocked modules, and loose `Function` placeholders.
  // These are standard Jest patterns that trip no-explicit-any /
  // no-require-imports / no-unsafe-function-type. Relax them for test files
  // rather than hand-typing throwaway mocks against the full google.maps
  // surface or littering per-line disables.
  {
    files: ['src/setupTests.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  }
);
