import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'theme-test/assets/**', 'cartjs.zip', 'docs/theme/**']
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      // Minimal recommended — keep CartJS style permissive for now
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'off' // CartJS uses globals (Cart, Item, jQuery) via IIFE
    }
  },
  {
    files: ['spec/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
        CartJS: 'readonly',
        Fixtures: 'readonly',
        rivets: 'readonly',
        tinybind: 'readonly',
        jQuery: 'readonly',
        $: 'readonly'
      }
    }
  }
];
