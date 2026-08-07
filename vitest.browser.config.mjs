import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    include: ['spec/browser/**/*.js'],
    exclude: ['spec/browser/setup.browser.js', 'spec/browser/fixtures.html'],
    globals: true,
    // Do not use happy-dom here — real browser via Playwright
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    setupFiles: ['spec/browser/setup.browser.js'],
    // Give browser tests more time (rendering, Ajax)
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
