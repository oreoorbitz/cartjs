# Theme Test with Shopify CLI

This document explains how to test the bundled `dist/cart.js` and `dist/rivets-cart.js` on a real Shopify theme using Shopify CLI (`@shopify/cli@4.6.1`).

> Reference: `plans/006-shopify-cli-theme-test-plan.md`, `https://shopify.dev/docs/storefronts/themes/tools/cli`

## Prerequisites

- Node `24.19.0` (see `.nvmrc`). Shopify CLI requires `>=22.12.0`. Node `20.17.0` will fail with `SyntaxError: enableCompileCache` and `EBADENGINE` warnings. Use `scripts/use-nvmrc.sh` or `nvm use`:
  ```bash
  ./scripts/use-nvmrc.sh
  node -v  # must be 24.19.0
  ```
- Shopify Partner account and a development store (`*.myshopify.com`) for `theme dev` / `theme push` (not needed for `theme check`).
- Install deps: `NPM_CONFIG_CACHE=/tmp/npm-cache-adhoc npm install` — adds `@shopify/cli` as devDependency (28 MB).

## What was installed

- `devDependency`: `@shopify/cli@4.6.1` (bin `shopify`). Programmatic use is via `npx shopify` spawn. The lighter library `@shopify/theme@3.58.2` was **not** added; add it later only if you need typed `import { check } from '@shopify/theme'` instead of spawn.
- `esbuild` dedupe: CLI uses `esbuild@0.28.1`, Vite uses `0.25.12`. Both coexist (`npm ls esbuild` shows two copies). This is expected.
- `theme-test/` fixture: minimal theme (`layout/theme.liquid`, `templates/index.liquid`, `config/settings_schema.json`) that includes `{{ 'cart.min.js' | asset_url | script_tag }}` and exercises `data-cart-*` + `CartJS.init`.

## Workflow

1. **Build dist** (required before every theme test):
   ```bash
   npm run build
   # produces dist/cart.js, dist/rivets-cart.js, dist/*.min.js (IIFE, banner frozen)
   ```

2. **Sync assets to fixture**:
   ```bash
   npm run theme:assets
   # copies dist/*.js → theme-test/assets/ (fails if dist missing)
   ```

3. **Offline check (no store, CI-safe)**:
   ```bash
   npm run theme:check
   # = npm run build && npm run theme:assets && shopify theme check theme-test
   ```
   Lints Liquid and assets. Must exit 0 with no errors about `cart.js`. On Node `20.17.0` this command fails at `shopify` startup (expected); use Node 24.

4. **Local dev with hot reload (requires store)**:
   ```bash
   shopify auth login
   npm run theme:dev -- --store=my-dev-store.myshopify.com
   # or SHOPIFY_FLAG_STORE=my-dev-store.myshopify.com npm run theme:dev
   ```
   Opens `http://127.0.0.1:9292`. Verify: `CartJS` in console, `CartJS.cart`, add/clear buttons work, Ajax `/cart.js` succeeds.

5. **Push for review (optional)**:
   ```bash
   npm run theme:push -- --store=my-dev-store.myshopify.com
   # pushes unpublished theme for QA
   ```

6. **Shortcut**:
   ```bash
   npm run test:theme  # alias for theme:check
   ```

## CI handling

- `theme:check` is the only theme test that should run in CI (no token needed).
- `theme:dev` and `theme:push` require `SHOPIFY_CLI_THEME_TOKEN` or interactive login. Guard CI:
  ```bash
  if [ -z "$SHOPIFY_CLI_THEME_TOKEN" ]; then echo "Skipping theme:dev (no token)"; exit 0; fi
  npm run theme:check
  ```
- CI must use Node `24.19.0` (see `.nvmrc` / `.tool-versions`).

## Drop-in guarantee

- `dist/cart.js` and `dist/rivets-cart.js` paths, banner (`// Cart.js`), IIFE `(function(){...}).call(window)`, and globals (`window.CartJS`, `window.tinybind`, `window.mepto`) are frozen. `theme-test` proves a theme can `{{ 'cart.min.js' | asset_url | script_tag }}` without code changes.

## Troubleshooting

- `SyntaxError: enableCompileCache` → Node <22.12. Run `scripts/use-nvmrc.sh`.
- `EBADENGINE meptos requires 24.x` → same, use Node 24.
- `theme check` complains about missing `settings_data.json` → ignored; placeholder is intentional. Do not commit real store data.
- `esbuild` version warnings → two copies is expected; `npm run build` (Vite) still uses `0.25.12`, CLI uses `0.28.1`.

## Scripts added

| Script | Command |
|--------|---------|
| `theme:init` | `shopify theme init theme-test ...` |
| `theme:assets` | `node scripts/sync-theme-assets.js` |
| `theme:check` | `build && assets && shopify theme check theme-test` |
| `theme:dev` | `build && assets && shopify theme dev --path=theme-test` |
| `theme:push` | `build && assets && shopify theme push --path=theme-test` |
| `test:theme` | `theme:check` |
