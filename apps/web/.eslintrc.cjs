module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  globals: {
    // DOM/Web API types used as value types
    RequestInit: 'readonly',
    HeadersInit: 'readonly',
    IntersectionObserverInit: 'readonly',
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Relaxed rules for existing codebase
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn', 
      { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        // Ignore unused vars in destructuring patterns (common in React)
        ignoreRestSiblings: true,
        // Don't warn about unused args in callbacks
        args: 'after-used',
      }
    ],
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-empty': 'warn',
    'prefer-const': 'warn',
    // TypeScript handles these
    'no-undef': 'off',
  },
};
