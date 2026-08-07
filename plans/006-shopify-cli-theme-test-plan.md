# 006 — Install Shopify CLI as Dev Dependency for Programmatic Theme Test

> Standard: ASD-STE100 Simplified Technical English, Issue 8
> Reference: `https://shopify.dev/docs/api/shopify-cli`, `https://shopify.dev/docs/storefronts/themes/tools/cli`, `package.json`, `vite.config.js`, `dist/cart.js`, `AGENTS.md` §2, §3
> Status: Draft — execution follows this plan step-by-step
> Risk level: Medium — heavy dev dependency, requires store authentication, must not break CI

## 1. Objective

Add Shopify CLI as a `devDependency`. Use it to test the final bundled `dist/cart.js` and `dist/rivets-cart.js` on a real test Shopify theme. Keep the public CartJS API frozen.

## 2. Context

CartJS ships as a drop-in script for Shopify themes. Themes include `dist/cart.js` or `dist/rivets-cart.js` via `{{ 'cart.js' | asset_url | script_tag }}`. The build now uses Vite (`vite@6.4.3`) on Node `24.19.0` (`.nvmrc`). Verification so far uses `vitest` + `happy-dom` only. That covers unit behaviour. It does not cover theme integration: asset pipeline, Liquid rendering, or Ajax cart endpoints on a real store.

Shopify CLI validates that integration:

- `shopify theme init` creates a minimal theme scaffold.
- `shopify theme check` lints Liquid and assets without a store.
- `shopify theme dev` serves the theme with hot reload against a development store.
- `shopify theme push` deploys a theme for automated checks.

Shopify CLI is the single tool that supports all four steps. It also exposes a programmatic surface via `npx shopify` and the library `@shopify/theme`.

Current project decision point: choose between `@shopify/cli` (CLI binary), `@shopify/theme` (library), or both.

## 3. Scope

### 3.1 In scope

- Add Shopify CLI as `devDependency` for programmatic theme test.
- Define `npm` scripts to test the bundled files on a theme.
- Add a minimal test theme fixture that imports `dist/cart.js`.
- Document authentication and usage (no secrets in repo).
- Keep `npm install` and `npm run build` green.

### 3.2 Out of scope

- Do not change `CartJS.*` public API or `data-cart-*` contract.
- Do not change `src/*.js` logic or `vite.config.js` output.
- Do not create or commit a real `.env` or store credentials.
- Do not migrate `docs/theme` (Terraform/Jade) to a full Shopify theme in this plan.
- Do not publish the test theme to the Theme Store.

## 4. Inputs

- `package.json` (`devDependencies`, `scripts`, `overrides`, `engines` via `.nvmrc`)
- `vite.config.js` (Vite 6.4.3 concat build: `src/*.js` → `dist/cart.js` → `dist/rivets-cart.js`)
- `dist/cart.js`, `dist/rivets-cart.js`, `dist/*.min.js` (IIFE, banner frozen)
- `AGENTS.md` §2 (drop-in contract), §3 (Mepto test bed)
- `@shopify/cli@latest` on npm (`4.6.1`, requires `node >=22.12.0`, 28 MB unpacked, bin `shopify` → `bin/run.js`, deps `esbuild@0.28.1`)
- `@shopify/theme@latest` on npm (`3.58.2`, library for programmatic theme operations)
- `https://shopify.dev/docs/storefronts/themes/tools/cli` (theme commands)
- `https://shopify.dev/docs/api/shopify-cli` (CLI reference)

## 5. Findings (evidence)

### 5.1 Package choice

| Package | Version | Size | Node | Provides |
|---------|---------|------|------|----------|
| `@shopify/cli` | `4.6.1` (latest 2026-08-07) | 28 MB, 579 files | `>=22.12.0` | `npx shopify` binary, `theme`, `app`, `hydrogen` commands |
| `@shopify/theme` | `3.58.2` | ~5 MB | `>=18` | Programmatic API `import { ... } from '@shopify/theme'` |

- `npm view @shopify/cli version` returns `4.6.1`, `engines: { node: '>=22.12.0' }`. The project uses `24.19.0`, so the requirement is satisfied. Node `20.17.0` (system default) would fail; developers must use `scripts/use-nvmrc.sh` or `nvm use`.
- `npm view @shopify/theme version` returns `3.58.2`. It is lighter and has no `oclif` CLI boot cost. It does not provide `shopify theme dev` hot reload; only the CLI does.
- Both packages come from `https://registry.npmjs.org/@shopify%2Fcli`. The CLI is `oclif`-based. Its programmatic API is the binary itself. You call it via `execa`/`child_process`. The theme library exposes `check`, `dev`, `push` as functions.

**Recommendation:** Install `@shopify/cli` as `devDependency`. Optionally also install `@shopify/theme` if you need library calls without shell spawn. Start with CLI only; add the library only if spawn proves too slow or you need typed access.

### 5.2 Weight and install cost

- `@shopify/cli` unpacked is 28 MB. It adds `esbuild@0.28.1` (already via Vite) and `@ast-grep/napi`. Full `npm install` time will increase by ~10–20 s. CI cache must include `~/.npm` or `node_modules`.
- Mark it as `devDependency` only. Do not set `optionalDependencies`. The test theme scripts must guard with `if (process.env.SHOPIFY_STORE)` or skip when CLI is absent, so CI without a store still passes.
- Consider `package.json` `overrides` conflict: CLI pins `esbuild@0.28.1`, Vite uses `esbuild@0.25.x`. Both can coexist. Test `npm ls esbuild` after install. If dedupe fails, pin `esbuild` via `overrides` or tolerate two copies (Vite uses its own).

### 5.3 Authentication model

Shopify CLI authenticates via OAuth to a Partner account and a development store. It stores tokens in `~/.config/shopify` (or `SHOPIFY_CLI_*` env vars). The repo must never commit tokens.

Local test needs:

1. A Partner account with a development store (free, `*.myshopify.com`).
2. `SHOPIFY_FLAG_STORE` or `shopify theme dev --store=<store>` with env `SHOPIFY_CLI_THEME_TOKEN` or interactive `shopify auth login`.

CI test needs either:

- A `SHOPIFY_CLI_THEME_TOKEN` secret (storefront token), or
- Skip theme test in CI and document local-only execution.

### 5.4 Programmatic use patterns

**Via CLI spawn (recommended for this plan):**

```js
// scripts/test-theme.js
import { execa } from 'execa';
await execa('npx', ['shopify', 'theme', 'check', 'theme-test'], { stdio: 'inherit' });
```

Or `child_process.spawnSync('npx', ['shopify','theme','check'])`. This works after `npm install --save-dev @shopify/cli`.

**Via library (alternative):**

```js
import { check } from '@shopify/theme';
await check('theme-test');
```

The library avoids spawn overhead but does not support `dev` hot reload. For hot reload you still need the CLI.

### 5.5 Theme fixture design

Do not reuse `docs/theme` (Terraform/Jade). Create a new minimal fixture:

```
theme-test/
  config/settings_schema.json
  layout/theme.liquid          # includes {{ 'cart.min.js' | asset_url | script_tag }}
  assets/cart.js               # copied from dist/cart.js on pretest
  assets/rivets-cart.js        # copied from dist/rivets-cart.js
  templates/index.liquid       # cart form with data-cart-* bindings
  .shopifyignore
```

The fixture stays in the repo (no store data). Scripts copy `dist/*.js` into `theme-test/assets/` before `theme check` or `theme dev`. This proves the bundle is a drop-in.

### 5.6 Current project gaps

- No `theme-test/` directory exists.
- No `execa` or `cross-spawn` helper is installed. Use `node:child_process` to avoid a new dep, or add `execa@latest` (light, `6 kB`).
- `vitest` already uses Vite; no conflict with Shopify CLI.
- `npm run build` must run before `theme:check` so `dist/*.js` are fresh.

## 6. Procedure

Do the steps in order. One action per step. Verify after each step. Keep API frozen.

1. Confirm Node: `node -v` must show `24.19.0` (or `>=22.12.0`). Run `scripts/use-nvmrc.sh` if it does not. Check `npm view @shopify/cli version` shows `4.6.1` and `engines` `>=22.12.0`.

2. Install CLI as dev dep (use project cache workaround):
   ```
   NPM_CONFIG_CACHE=/tmp/npm-cache-adhoc npm install --save-dev @shopify/cli@latest
   ```
   Verify `npx shopify --version` prints `4.6.1` (or `Version: 4.6.1`). Verify `npm ls @shopify/cli` shows one entry. Record `npm ls esbuild` to check dedupe.

3. Decide on `@shopify/theme`: if programmatic library is needed, also run `NPM_CONFIG_CACHE=/tmp/npm-cache-adhoc npm install --save-dev @shopify/theme@latest`. If not, document that CLI spawn is the chosen surface and note when to add the library.

4. Add `npm` scripts to `package.json`:
   ```
   "theme:init": "shopify theme init theme-test --clone-url=https://github.com/Shopify/dawn --path=theme-test || shopify theme init theme-test",
   "theme:assets": "node scripts/sync-theme-assets.js",
   "theme:check": "npm run build && npm run theme:assets && shopify theme check theme-test",
   "theme:dev": "npm run build && npm run theme:assets && shopify theme dev --path=theme-test",
   "theme:push": "npm run build && npm run theme:assets && shopify theme push --path=theme-test --unpublished --json",
   "test:theme": "npm run theme:check"
   ```
   Keep `build`, `watch`, `test` unchanged. Theme scripts must call `build` first.

5. Create `scripts/sync-theme-assets.js`:
   - Read `dist/cart.js`, `dist/rivets-cart.js`, `dist/cart.min.js`, `dist/rivets-cart.min.js`.
   - Copy each to `theme-test/assets/` (create dir if missing).
   - Preserve banner and IIFE. Log bytes copied.
   - Exit non-zero if `dist/*.js` is missing (prompts to run `npm run build`).

6. Create minimal `theme-test/` fixture:
   - `theme-test/layout/theme.liquid` with `{{ 'cart.min.js' | asset_url | script_tag }}` (or `rivets-cart` variant) after `content_for_header`.
   - `theme-test/templates/index.liquid` with a cart form that uses `data-cart-*` attributes and a `CartJS.*` smoke call.
   - `theme-test/config/settings_schema.json` minimal (empty array).
   - `theme-test/.shopifyignore` to ignore `node_modules`, `dist`, `.git`.
   - Do not commit store-specific `config/settings_data.json` with secrets; use a placeholder.

7. Test without store (must pass in CI):
   ```
   npm run theme:check
   ```
   This runs `shopify theme check` offline. It must exit `0` with no Liquid errors about `cart.js` asset. Fix any `theme-check` errors (missing `theme.liquid`, unclosed tags).

8. Test with store (local only, manual):
   ```
   SHOPIFY_FLAG_STORE=my-dev-store.myshopify.com npm run theme:dev
   ```
   Document that this requires `shopify auth login` once and a Partner dev store. Verify the store loads `cart.js`, `CartJS.init` fires, and Ajax cart works. Record the manual verification steps (open `http://127.0.0.1:9292`, add item, check `CartJS.cart`).

9. Document in `docs/THEME_TEST.md` (or `README.md` section):
   - Prerequisites: Node `24.19.0`, Partner account, dev store.
   - Install: `NPM_CONFIG_CACHE=/tmp/npm-cache-adhoc npm install`.
   - No-store check: `npm run theme:check`.
   - Store dev: `shopify auth login` then `npm run theme:dev -- --store=<store>`.
   - `SHOPIFY_CLI_THEME_TOKEN` env for CI (optional, skipped if absent).
   - How `scripts/sync-theme-assets.js` copies `dist/*.js` and why `dist` must be built first.
   - Drop-in guarantee: `dist/cart.js` path and globals unchanged.

10. CI handling:
    - Add `SHOPIFY_CLI_THEME_TOKEN` as optional secret in CI config (if used). Guard `npm run test:theme` so it skips when secret is absent: `if [ -z "$SHOPIFY_CLI_THEME_TOKEN" ]; then echo "Skipping theme test (no token)"; exit 0; fi`.
    - Alternatively run only `theme:check` in CI (no token needed) and keep `theme:dev`/`push` local-only. Decide and document.

11. Update `AGENTS.md` §2 (build) and `docs/NVM.md` to mention `npm run theme:check` and Node `>=22.12.0` requirement from Shopify CLI. Keep `.nvmrc` at `24.19.0`.

12. Verify incremental build stays green:
    ```
    npx vite build && npx vitest run && npm run theme:check
    ```
    All three must pass. Check `npm ls` shows no `EBADENGINE`.

## 7. Constraints (vital — API and build must remain intact)

- **Public CartJS API frozen:** `CartJS.*`, `data-cart-*`, `window.CartJS`, `window.rivets`/`tinybind`, `window.jQuery`/`$`/`mepto` — no change.
- **Filenames frozen:** `dist/cart.js`, `dist/rivets-cart.js`, `dist/*.min.js` stay at same paths with same banner and IIFE.
- **Node version frozen at `24.19.0`:** `.nvmrc` stays `24.19.0`; Shopify CLI requires `>=22.12.0`, so it is satisfied. Document that system Node `20.17.0` will error with `EBADENGINE`; use `scripts/use-nvmrc.sh`.
- **No secrets in repo:** Do not commit `.env`, `theme-test/config/settings_data.json` with store data, or `~/.config/shopify` tokens. Add to `.gitignore` if needed.
- **CI must stay green without a store:** `theme:check` must pass offline; `theme:dev`/`push` must skip when no token is present.
- **No new runtime dependency:** Shopify CLI is `devDependency` only. It must not bloat `dist/*.js` or add to `dependencies`.
- Follow STE100 for new MD files (≤20 words/sentence, active voice, vertical lists).

## 8. Risks

- **Heavy install (28 MB, 579 files):** `npm install` will be slower and `npm ls` will show a second `esbuild`. Mitigation: dev-only, cache `node_modules`, document `NPM_CONFIG_CACHE=/tmp/npm-cache-adhoc` workaround for ancient lockfile.
- **Node engine mismatch on dev machines:** CLI `>=22.12.0` will warn on `20.17.0`. Mitigation: `.nvmrc` `24.19.0` plus `scripts/use-nvmrc.sh`; CI must use `24.19.0`.
- **Authentication friction:** `theme dev`/`push` need a Partner dev store and OAuth. Mitigation: `theme:check` works offline; make `dev`/`push` manual and optional; document `shopify auth login` and `SHOPIFY_FLAG_STORE`.
- **Theme fixture drift:** `theme-test/` derived from Dawn may diverge. Mitigation: keep fixture minimal (3 files + assets), copy `dist` on every test, do not fork full Dawn.
- **`esbuild` dedupe conflict:** CLI `0.28.1` vs Vite `0.25.x` may install twice. Mitigation: tolerate two copies or add `overrides: { "esbuild": "^0.28.1" }` only after testing `npm ls esbuild` and `npm run build`.
- **`@shopify/theme` vs `@shopify/cli` confusion:** Library does not support `dev` hot reload. Mitigation: choose CLI for `dev`/`push`, library only for typed `check` if needed; document choice in `docs/THEME_TEST.md`.

## 9. Acceptance criteria

- [ ] `@shopify/cli@latest` (currently `4.6.1`) is in `devDependencies`; `npx shopify --version` works on Node `24.19.0`.
- [ ] `package.json` has `theme:check`, `theme:dev`, `theme:assets`, `test:theme` scripts that run `vite build` first and then `shopify theme *`.
- [ ] `scripts/sync-theme-assets.js` exists and copies `dist/*.js` to `theme-test/assets/` with banner intact.
- [ ] `theme-test/` fixture exists (`layout/theme.liquid` includes `cart.min.js`, `templates/index.liquid` uses `data-cart-*`, `config/settings_schema.json` minimal).
- [ ] `npm run theme:check` passes offline with no Liquid errors.
- [ ] `npm run build && npx vitest run` still pass; no `EBADENGINE` on Node `24.19.0`.
- [ ] `docs/THEME_TEST.md` (or `README.md` addendum) documents `shopify auth login`, `SHOPIFY_FLAG_STORE`, and CI skip when no token.
- [ ] No secrets committed; `.gitignore` covers `theme-test/config/settings_data.json` and `.env` if added.
- [ ] This plan `plans/006-shopify-cli-theme-test-plan.md` references `https://shopify.dev/docs/api/shopify-cli`, `package.json`, and `AGENTS.md` and follows STE100.

## 10. Output

This plan file `plans/006-shopify-cli-theme-test-plan.md`. Execution produces: `package.json` + `package-lock.json` (CLI dep), `scripts/sync-theme-assets.js`, `theme-test/` fixture, `docs/THEME_TEST.md`, updated `AGENTS.md`/`README.md` if needed, and a commit that cites this plan. The next plan (`007`) can migrate `docs/theme` or add CI `theme:check`.

## 11. STE100 checklist

- [ ] Each sentence ≤ 20 words.
- [ ] Each paragraph ≤ 6 sentences.
- [ ] One topic per sentence.
- [ ] Active voice only.
- [ ] Approved words only.
- [ ] Vertical lists for procedures.

## 12. References

- Prompt: user request 2026-08-07 `make a plan for installing the shopify cli as a dev dependency so that it can be used programatically to make testing the final bundled file on a test shopify theme`
- Tool: `https://shopify.dev/docs/api/shopify-cli` (CLI `4.6.1`, `shopify theme dev/check/push`)
- Tool: `https://shopify.dev/docs/storefronts/themes/tools/cli` (theme commands)
- Packages: `@shopify/cli@4.6.1` (`engines: node >=22.12.0`, bin `shopify`), `@shopify/theme@3.58.2`
- Build: `vite.config.js`, `package.json` (Vite `6.4.3`, Node `24.19.0`), `dist/cart.js` (IIFE, banner)
- Source: `src/*.js` (Mepto adapter, Tinybind), `docs/theme` (legacy)
- Plans: `005` (Vite drop-in), `004` (Mepto), `002` (Tinybind)
- Context: `AGENTS.md` §2, §3, `.nvmrc`, `scripts/use-nvmrc.sh`
