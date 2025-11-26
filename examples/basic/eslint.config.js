// eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Configuration de base ESLint
  eslint.configs.recommended,
  // Configuration de base TypeScript
  ...tseslint.configs.recommended,
  {
    // Appliquer ces règles aux fichiers .ts
    files: ['**/*.ts'],
    rules: {
      // Interdire le type 'any' (déclenche une erreur rouge)
      '@typescript-eslint/no-explicit-any': 'error'
    }
  }
);