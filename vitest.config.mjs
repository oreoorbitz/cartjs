import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['spec/cartjs/**/*.js'],
    exclude: ['spec/setup.js', 'spec/fixtures/**', 'spec/shopify/**', 'node_modules/**'],
    environment: 'happy-dom',
    globals: true,
    passWithNoTests: false,
    setupFiles: ['spec/setup.js'],
  },
});
