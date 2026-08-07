# Real Browser Testing for Development LLMs

This document explains the two testing layers and how an LLM should use them.

> Reference: `plans/008-browser-testing-harness-plan.md`, `https://vitest.dev/guide/browser.html`, `https://playwright.dev/docs/intro`

## Two layers

| Layer | Command | Env | Speed | What it proves |
|-------|---------|-----|-------|----------------|
| **Unit (fast)** | `npm test` | `happy-dom` in Node | ~350 ms, 28 tests | CartJS utils, formatters, tinybind shims, CartJS API |
| **Browser (real)** | `npm run test:browser` | Real Chromium via `playwright` + Vitest Browser Mode | ~800 ms, 4 tests | `dist/cart.js` IIFE, `tinybind` bindings, `data-cart-view` rendering, `window.jQuery===window.mepto` |

Keep `npm test` green first. Use `test:browser` when you change rendering, bindings, or `dist` output.

## Prerequisites

- Node `24.19.0` (`.nvmrc` / `.node-version` / `scripts/use-nvmrc.sh`). Playwright needs `>=18`, Shopify CLI needs `>=22.12.0`, both satisfied.
- Install browsers once:
  ```bash
  ./scripts/use-nvmrc.sh
  npm ci
  npx playwright install chromium
  ```

## How to run (LLM)

### Fast unit (happy-dom)

```bash
npm test
# or single-test focus:
npm test -- -t "money"
```

### Real browser (Chromium)

Headless (default, CI, LLM):

```bash
npm run build  # ensure dist/ is fresh
npm run test:browser
```

Headed (visible browser, for LLM screenshot debugging):

```bash
npm run test:browser:ui
# or
npm run test:browser:headed
```

Single-test focus:

```bash
npm run test:browser -- -t "money"
```

All tests (unit + browser):

```bash
npm run test:all
```

### Machine-readable output (LLM)

JSON for parsing:

```bash
npm run test:browser -- --reporter=json --outputFile=test-results/browser.json
cat test-results/browser.json | python3 -m json.tool | head -n 60
```

The JSON contains `numTotalTests`, `numPassedTests`, `testResults[].assertionResults[]` with `status`, `duration`, `failureMessages`.

JUnit (for CI):

```bash
npx vitest run --config=vitest.browser.config.mjs --reporter=junit --outputFile=test-results/junit.xml
```

Artifacts are gitignored: `test-results/`, `playwright-report/`, `playwright/.cache/`.

## What the browser smoke proves

`spec/browser/cart-smoke.js` loads the real `dist/cart.js` IIFE in a real `window` (not `happy-dom`):

- `CartJS` loads and `CartJS.init` sets empty cart.
- `rivets.formatters.money` / `tinybind.formatters.money` works.
- `data-cart-view` binds and updates on `CartJS.cart.update` (tinybind `each-*`).
- `window.jQuery === window.$ === window.mepto` and `window.rivets === window.tinybind`.

The fixture is `spec/browser/fixtures.html` (static HTML with `data-cart-view`). The setup `spec/browser/setup.browser.js` injects `meptos`, `tinybind`, and `dist/cart.js` via `<script>` in the browser page — same IIFE that Shopify themes use via `{{ 'cart.js' | asset_url }}`.

## Screenshots and traces (LLM)

Vitest Browser Mode exposes the Playwright `page`. In a test you can do:

```js
// inside a browser test
import { page } from '@vitest/browser/context';
await page.screenshot({ path: 'test-results/screenshot.png' });
```

For headed debugging, run `npm run test:browser:ui` and open the Vitest UI. For trace, use Playwright Test instead (future E2E):

```bash
# Future: theme-test E2E via Playwright Test (not yet in repo)
# npx playwright test
```

## Theme E2E (future)

`theme-test/` + `shopify theme dev` is a separate layer (Shopify CLI `4.6.1`). It needs a Partner dev store and `shopify auth login`. It is not part of `test:browser` (which is offline, no store). Plan `006` covers it. A future `playwright.config.ts` could start `shopify theme dev` as a `webServer`:

```ts
// playwright.config.ts (not yet committed)
webServer: { command: 'npm run theme:dev', url: 'http://127.0.0.1:9292', timeout: 60000 }
```

## CI

`.github/workflows/ci.yml` runs:

```yaml
- npm ci
- npm run lint
- npm run format
- npm run build
- npm test
- npx playwright install --with-deps chromium
- npm run test:browser
```

The browser job is `continue-on-error: true` for the first release, then required. It caches `~/.cache/ms-playwright`.

Locally the workflow file lives at `.github/workflows/ci.yml` but needs `workflow` OAuth scope to push (GitHub rejects pushes from Apps without it). If push fails with `refusing to allow an OAuth App to create or update workflow`, push the file via the GitHub UI or a PAT with `workflow` scope.

## For LLMs — checklist

- [ ] Run `npm run build` before `test:browser` (dist must be fresh).
- [ ] Run `npm test` first (fast feedback).
- [ ] Run `npm run test:browser -- --reporter=json --outputFile=test-results/browser.json` and parse JSON.
- [ ] On failure, read `failureMessages` and re-run headed (`test:browser:ui`) or add `page.screenshot()`.

## References

- `vitest.config.mjs` (happy-dom), `vitest.browser.config.mjs` (playwright)
- `spec/setup.js` (happy-dom), `spec/browser/setup.browser.js` (real browser)
- `vite.config.mjs` (`dist/cart.js` IIFE)
- `plans/008-browser-testing-harness-plan.md`
