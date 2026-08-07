# 008 — Real Browser Testing Harness for Development LLMs — Plan

> Standard: ASD-STE100 Simplified Technical English, Issue 8
> Reference: `AGENTS.md`, `vitest.config.mjs`, `spec/setup.js`, `spec/runner.html`, `theme-test/`, `vite.config.mjs`, `https://vitest.dev/guide/browser.html`, `https://playwright.dev/`
> Status: Draft — execution follows this plan step-by-step
> Risk level: Medium — adds heavy browser deps, must not break happy-dom unit tests

## 1. Objective

Set up a real browser testing harness that development LLMs can use programmatically. Keep `happy-dom` unit tests. Add a real browser path that verifies `dist/cart.js` and `dist/rivets-cart.js` against actual browser APIs.

## 2. Context

The project now tests with `vitest@4.1.10` + `happy-dom`. `spec/setup.js` loads `jquery`, `tinybind`, and `dist/cart.js` via `window.eval` and runs 28 tests. `spec/runner.html` still exists for `mocha` via `grunt test` (broken on `mocha 11.8` + `phantomjs`). `theme-test/` uses `@shopify/cli@4.6.1` to check a theme offline, but it does not render Liquid or run CartJS in a browser. `happy-dom` simulates DOM in Node. It does not paint, does not compute layout, and does not implement `IntersectionObserver`, `ResizeObserver`, or exact `getComputedStyle`. LLMs that work on `data-cart-*` bindings, `rivets`/`tinybind` view updates, and `CartJS` Ajax queues need a real browser to see if a change actually renders. The current harness is fast but not faithful. A real browser harness closes that gap and gives LLMs screenshots, traces, and headed debugging.

## 3. Scope

### 3.1 In scope

- Add a real browser test mode that LLMs can run headless or headed.
- Keep `happy-dom` for fast unit tests; add browser mode as a second `vitest` project or a separate `playwright` suite.
- Provide a single `spec/browser/` smoke that loads `dist/cart.js` in a real page and exercises `CartJS` + `tinybind` bindings.
- Add `npm` scripts that LLMs can call programmatically and get machine-readable output (JSON, JUnit).
- Document LLM workflow (how to run, how to capture screenshot/trace, how to run a single test).
- Make CI run browser tests optionally (allow failure while unstable, then enforce).

### 3.2 Out of scope

- Do not change `CartJS.*` public API or `data-cart-*` contract.
- Do not change `vite.config.mjs` output or `dist` filenames.
- Do not replace `happy-dom` unit tests; they stay the fast path.
- Do not use `phantomjs` or `grunt-mocha-phantomjs` for browser tests.
- Do not commit Playwright browser binaries to the repo.

## 4. Inputs

- `vitest@4.1.10` with `happy-dom@20.11.2`, `vitest.config.mjs`, `spec/setup.js`, `spec/runner.html`
- `vite@6.4.3` (`vite.config.mjs` builds `dist/cart.js` → `dist/rivets-cart.js`)
- `tinybind@1.0.0`, `meptos@2.0.0`, `jquery@4.0.0`
- `theme-test/` + `@shopify/cli@4.6.1` (`docs/THEME_TEST.md`)
- `https://vitest.dev/guide/browser.html` (Vitest Browser Mode, providers `playwright` / `webdriverio`)
- `https://playwright.dev/docs/intro` (Playwright Test, `npx playwright test`)
- `AGENTS.md` §2, §3, §4 (Mepto, prompts)

## 5. Findings (evidence)

### 5.1 Happy-dom is fast but not real

- `npm test` runs 28 tests in `~350 ms` (happy-dom). It correctly catches `CartJS.Utils`, `rivets` formatters, and `tinybind` shims after `spec/setup.js` fixes. It does not catch layout, CSS, or `window.eval` differences that only appear in a real browser. `spec/runner.html` was the original real-browser runner, but `grunt test` via `phantomjs` is deprecated and broken on `mocha@11.8`.

### 5.2 Two viable real-browser paths

| Path | Tool | Speed | Fidelity | LLM ergonomics |
|------|------|-------|----------|----------------|
| A | `vitest --browser` + `@vitest/browser-playwright` | Fast (reuses Vitest) | Real Chromium/Firefox/WebKit via Playwright | Single command, same `describe/it`, screenshots via `page.screenshot()` |
| B | `playwright test` standalone | Medium | Same real browsers, plus `trace`, `expect(page).toHaveScreenshot()` | Separate runner, richer E2E API, needs own config |

- `vitest@4` Browser Mode is stable and documented at `https://vitest.dev/guide/browser.html`. It requires separate provider packages: `@vitest/browser-playwright` or `@vitest/browser-webdriverio`. It reuses `vitest.config.mjs` with a `browser` field.
- `playwright test` is the heavier E2E option. It gives `playwright.config.ts`, `test()` API, and `npx playwright show-trace`. It does not reuse Vitest setup directly.
- Both install browsers on `npx playwright install` (~120 MB per browser). CI must cache.

### 5.3 Recommendation — Path A first, Path B later if needed

- Use **Vitest Browser Mode with Playwright provider** for LLM use. It keeps one test framework (Vitest), one config, and `happy-dom` as the default. LLMs run `npm test` for fast unit and `npm run test:browser` for real browser, with the same `spec` files.
- Keep `playwright test` as a future option for full E2E (e.g., `theme-test` served via `shopify theme dev` + Playwright `page.goto('http://127.0.0.1:9292')`). Do not add it now; add a placeholder `playwright.config.ts` only if E2E is needed.

### 5.4 What LLM needs from the harness

- **Deterministic headless run:** `npm run test:browser -- --run --reporter=json` returns JSON that LLM can parse without screenshots.
- **Headed debug:** `npm run test:browser:ui` or `HEADLESS=false` opens a visible browser for `page.screenshot()` inspection.
- **Single-test focus:** `npm run test:browser -- -t "money formatter"` must work.
- **Artifact on failure:** screenshot and `trace.zip` in `test-results/` when a test fails.
- **No store required:** browser tests must run offline against a static `spec/browser/fixtures.html` that loads `dist/cart.js`, not against a dev store.

### 5.5 Static fixture for browser

- Create `spec/browser/fixtures.html` (or `spec/browser/index.html`) that loads `dist/cart.js` + `dist/rivets-cart.js` + `tinybind` + `meptos` via `<script>` tags (like `spec/runner.html` but minimal). Add a `data-cart-view` element and a cart JSON stub so `CartJS.init` can run without Ajax.

## 6. Procedure

Do the steps in order. One action per step. Verify after each step. Keep API frozen.

1. Install browser deps (on Node `24.19.0`):
   ```
   npm install --save-dev @vitest/browser@latest @vitest/browser-playwright@latest playwright@latest
   ```
   Then `npx playwright install chromium --with-deps` (or `--with-deps` on CI, without on Mac). Verify `npx playwright --version` works. Record `npm ls @vitest/browser` and `npx playwright --version`.

2. Add `vitest.browser.config.mjs` **or** extend `vitest.config.mjs` with a `browser` field (prefer separate file to keep happy-dom default fast):
   ```js
   // vitest.browser.config.mjs
   import { defineConfig } from 'vitest/config';
   export default defineConfig({
     test: {
       include: ['spec/browser/**/*.js', 'spec/cartjs/**/*.js'],
       browser: {
         enabled: true,
         provider: 'playwright',
         headless: true,
         instances: [{ browser: 'chromium' }],
         // Keep happy-dom tests runnable by excluding them if needed
       },
       setupFiles: ['spec/browser/setup.browser.js'],
     },
   });
   ```
   Alternative: add `projects` to `vitest.config.mjs` with `name: 'unit'` (happy-dom) and `name: 'browser'` (playwright). Choose one and document.

3. Create `spec/browser/setup.browser.js`:
   - Import `should`.
   - Load `dist/cart.js` via `<script>` injection or `import` (browser can `import` ESM, but `dist` is IIFE — use `await page.evaluate` or `fetch` + `eval` in setup).
   - Set `window.jQuery = window.$ = window.mepto` before loading `dist`.

4. Create `spec/browser/fixtures.html`:
   ```html
   <!doctype html>
   <html><head><meta charset="utf-8"><title>CartJS Browser Fixture</title></head>
   <body>
     <div data-cart-view>{cart.item_count}</div>
     <script src="../../node_modules/meptos/dist/meptos.umd.cjs"></script>
     <script>window.jQuery = window.$ = window.mepto;</script>
     <script src="../../node_modules/tinybind/dist/tinybind.js"></script>
     <script>window.rivets = window.tinybind;</script>
     <script src="../../dist/cart.js"></script>
   </body></html>
   ```
   This is the page Playwright loads via `page.goto('file://...')` or `vitest browser` via `page.goto`.

5. Add a minimal browser smoke `spec/browser/cart-smoke.js`:
   - `describe('CartJS browser', () => { it('init renders data-cart-view', async () => { ... }) })`
   - Use `expect(document.querySelector('[data-cart-view]').textContent).toContain('0')` after `CartJS.init({item_count:0})`.
   - This proves the browser can load `dist` and `tinybind` bindings.

6. Add `package.json` scripts:
   ```
   "test:browser": "vitest run --config=vitest.browser.config.mjs --reporter=verbose",
   "test:browser:ui": "vitest --config=vitest.browser.config.mjs --browser.headless=false --run=false",
   "test:browser:headed": "HEADLESS=false vitest run --config=vitest.browser.config.mjs",
   "test:all": "npm test && npm run test:browser"
   ```
   Keep `test` as happy-dom fast path. Document that LLMs should run `test` first, then `test:browser` for rendering checks.

7. Wire LLM-friendly output:
   - Ensure `npm run test:browser -- --reporter=json --outputFile=test-results/browser.json` works.
   - Add `test-results/` to `.gitignore`.
   - Configure `browser.screenshotFailures: true` and `trace` if supported (or use `playwright` trace via `context.tracing`).

8. Verify locally (on `24.19.0`):
   ```
   npm run build && npm test && npm run test:browser -- --run
   ```
   All three must pass. Check that `test:browser` loads the real `dist/cart.js` (not `spec/setup.js` happy-dom stub).

9. Document in `docs/BROWSER_TEST.md` (or `README.md` section):
   - Prereqs: Node `24.19.0`, `npx playwright install chromium`.
   - Fast unit: `npm test`.
   - Real browser: `npm run test:browser` (headless), `npm run test:browser:ui` (headed), single-test `npm run test:browser -- -t "money"`.
   - How LLMs should use it: run `test:browser --reporter=json` and read `test-results/browser.json`; capture screenshot on failure via `expect(page).toHaveScreenshot()` or `page.screenshot({path})`.
   - Theme E2E future: `playwright.config.ts` with `webServer: { command: 'npm run theme:dev', url: 'http://127.0.0.1:9292' }`.

10. CI handling:
    - Add a `browser` job to `.github/workflows/ci.yml` (or extend existing `ci` job) that runs `npx playwright install --with-deps chromium` then `npm run test:browser`.
    - Make it `continue-on-error: true` for the first release, then required.
    - Cache `~/.cache/ms-playwright`.

11. Keep `happy-dom` as default:
    - Do not change `vitest.config.mjs` `environment: happy-dom` for unit tests.
    - Browser config is separate, so `npm test` stays ~350 ms.

## 7. Constraints (vital — API and build must remain intact)

- **Public CartJS API frozen:** `CartJS.*`, `data-cart-*`, `window.CartJS`, `window.tinybind`/`rivets`, `window.jQuery`/`mepto` — no change.
- **Filenames frozen:** `dist/cart.js`, `dist/rivets-cart.js`, `dist/*.min.js` stay at same paths.
- **Node `24.19.0` stays in `.nvmrc`:** Playwright requires `>=18`, satisfied; add `playwright` to `devDependencies` only.
- **No `phantomjs`:** Do not reintroduce `grunt-mocha-phantomjs`.
- **No store required for browser tests:** `spec/browser/fixtures.html` is static; `theme-test` + `shopify theme dev` is a separate E2E future.
- **Incremental:** Keep `npm test` green after each step; browser tests may be `continue-on-error` in CI for one release.

## 8. Risks

- **Heavy install:** `@vitest/browser` + `playwright` + Chromium is ~300 MB. `npm install` will be slower. Mitigation: `devDependency` only, CI caches `~/.cache/ms-playwright`, `npx playwright install chromium` only (not `firefox`/`webkit` initially).
- **Browser flakiness:** `data-cart-view` bindings depend on `tinybind` timing; browser tests may be slower than happy-dom. Mitigation: use `await` + `expect.poll`, set `browser.instances[0].launch: { timeout: 30000 }`.
- **Config split confusion:** Two configs (`vitest.config.mjs` vs `vitest.browser.config.mjs`) can diverge. Mitigation: share `setupFiles` and document `test` vs `test:browser` in `docs/BROWSER_TEST.md` and `AGENTS.md`.
- **Playwright on Node 20 fails:** Playwright `1.50+` requires `>=18` but `16`+ works; however `shopify` still needs `24`. Mitigation: CI and local must use `24.19.0` via `scripts/use-nvmrc.sh`.
- **LLM tool-calling:** LLMs need JSON output, not terminal colors. Mitigation: document ` --reporter=json --outputFile=` and `page.screenshot()` usage for LLM harnesses.

## 9. Acceptance criteria

- [ ] `@vitest/browser`, `@vitest/browser-playwright`, `playwright` in `devDependencies`; `npx playwright --version` works on Node `24.19.0`.
- [ ] `vitest.browser.config.mjs` (or `projects` in `vitest.config.mjs`) with `browser: { enabled: true, provider: 'playwright', headless: true, instances: [{ browser: 'chromium' }] }`.
- [ ] `spec/browser/fixtures.html` loads `dist/cart.js` + `tinybind` + `meptos` and renders `data-cart-view`.
- [ ] `spec/browser/cart-smoke.js` (or similar) passes in `npm run test:browser`.
- [ ] `package.json` has `test:browser`, `test:browser:ui`, `test:all` scripts; `npm test` still runs happy-dom (28 tests, ~350 ms).
- [ ] `npm run test:browser -- --reporter=json --outputFile=test-results/browser.json` produces JSON that LLM can parse.
- [ ] `docs/BROWSER_TEST.md` documents fast vs browser, headed vs headless, single-test, and LLM JSON/screenshot workflow.
- [ ] `.gitignore` contains `test-results/` and `playwright/.cache` if needed.
- [ ] `.github/workflows/ci.yml` has a browser job (or step) with `npx playwright install`.
- [ ] This file `plans/008-browser-testing-harness-plan.md` references `https://vitest.dev/guide/browser.html`, `https://playwright.dev/docs/intro`, `vitest.config.mjs`, and `AGENTS.md`.

## 10. Output

This plan file `plans/008-browser-testing-harness-plan.md`. Execution produces: `package.json`/`lockfile` (browser deps), `vitest.browser.config.mjs` (or updated `vitest.config.mjs`), `spec/browser/` (`fixtures.html`, `setup.browser.js`, `cart-smoke.js`), `docs/BROWSER_TEST.md`, updated `.gitignore`, updated `AGENTS.md` if needed, and a commit that cites this plan.

## 11. STE100 checklist

- [ ] Each sentence ≤ 20 words.
- [ ] Each paragraph ≤ 6 sentences.
- [ ] One topic per sentence.
- [ ] Active voice only.
- [ ] Approved words only.
- [ ] Vertical lists for procedures.

## 12. References

- Prompt: user request 2026-08-07 `make a plan to setup a real browser testing harness for development LLMs to use in this repo`
- Tool: `https://vitest.dev/guide/browser.html` (Vitest Browser Mode, `browser.enabled`, `provider: playwright`)
- Tool: `https://playwright.dev/docs/intro` (Playwright Test, `npx playwright install`)
- Build: `vite.config.mjs`, `vitest.config.mjs`, `happy-dom@20.11.2`, `vitest@4.1.10`
- Source: `spec/runner.html`, `spec/setup.js`, `theme-test/`, `dist/cart.js`
- Docs: `AGENTS.md` §2, §3, §6, `docs/NVM.md`, `docs/THEME_TEST.md`
- Plans: `005` (Vite), `006` (Shopify CLI), `007` (ergonomics)

