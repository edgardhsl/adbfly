import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', 'out/**', 'build/**', 'site/**', 'next-env.d.ts'] },
  {
    files: ['**/*.{js,cjs}'],
    rules: {
      // Configuration and CLI scripts use CommonJS by design.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // Existing UI effects require gradual refactoring. Keep these checks visible
      // as warnings rather than blocking installation of a functional lint gate.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];

export default eslintConfig;
