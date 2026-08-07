# 005 — Replace Grunt with Vite — Drop-in Build Plan

> Standard: ASD-STE100 Simplified Technical English, Issue 8
> Reference: `https://vitejs.dev/`, `Gruntfile.coffee`, `package.json`, `plans/003-decaffeinate-to-js-plan.md`, `plans/004-jquery-to-mepto-plan.md`
> Status: Draft — execution follows this plan step-by-step
> Risk level: Medium — API must remain identical, filenames must remain identical

## 1. Objective

Replace `Grunt` (`grunt@1.6.3` + 9 `grunt-contrib-*` plugins) with `Vite` (`vite@latest`) for building `dist/*`. Keep every public API and every `dist` filename identical. The result must be a drop-in for Shopify themes.

**Vital constraint:** Themes include `dist/cart.js` or `dist/rivets-cart.min.js` via `<script src>` or `{{ 'cart.js' | asset_url }}`. They expect `window.CartJS`, `dist/rivets-cart.js` (tinybind + cart), and `dist/*.min.js` to exist at the same paths with the same globals. If the build output changes name, wrapper, or globals, the update is not a drop-in.

## 2. Context

Current build (`Gruntfile.coffee`):

- `concat:build_js`: joins `src/mepto-adapter.js` + `src/cart.js` + `src/item.js` + `src/cartjs.js` + `src/utils.js` + `src/queue.js` + `src/core.js` + `src/data.js` + `src/rivets.js` + `src/export.js` → `dist/cart.js` with IIFE wrapper `(function(){...}).call(window)` and banner `// Cart.js`.
- `concat:build`: joins `tinybind/dist/tinybind.js` + `dist/cart.js` → `dist/rivets-cart.js` (keeps legacy filename).
- `uglify:build`: minifies both to `dist/*.min.js` with `grunt-contrib-uglify@5.2.2`.
- `terraform`, `less`, `compress`, `copy` for docs (`docs/theme`).
- `watch:build` on `src/*.js`, `mocha_phantomjs:test` on `spec/runner.html` (broken on `mocha@11.8` + `phantomjs`).

All `src/*.js` are now vanilla JS (plan 003, via `decaffeinate`), and `tinybind` is ES6, `mepto-adapter` is vanilla JS. Grunt is the last CoffeeScript-era tool. Vite can:

- Bundle `src/*.js` via `rollup` (used internally by Vite) with IIFE output, banner, and minification (`esbuild`).
- Replace `grunt-contrib-uglify` (uses `uglify-js@3`) with `esbuild` minify (faster, modern).
- Replace `grunt-contrib-watch` with `vite --watch`.
- Keep `terraform`/`less` for docs or replace with Vite plugins later (out of scope for this plan).

Why Vite:

- Already used by `vitest@4.1.10` (same `vite` core), so no extra major dep.
- Handles IIFE + banner + sourcemap + minify in one config.
- `vite build` respects `package.json` `type` and can output `dist/cart.js` (IIFE, global `CartJS`) and `dist/rivets-cart.js` (IIFE, `tinybind` + `cart`).
- Keeps Node `24.19.0` LTS (see `.nvmrc`) — Vite requires `node >= 20.19.0`, satisfied.

## 3. Scope

### 3.1 In scope

- Add `vite@latest` to `devDependencies`, create `vite.config.js` (or `vite.config.mjs`).
- Define two IIFE builds: `cart` (from `src/*.js` entry) and `rivets-cart` (from `tinybind` + `cart`).
- Replicate banner, IIFE wrapper, minification, and filenames exactly (`dist/cart.js`, `dist/cart.min.js`, `dist/rivets-cart.js`, `dist/rivets-cart.min.js`).
- Update `package.json` scripts: `build` → `vite build`, `watch` → `vite build --watch`, `test` → `vitest` (keep `grunt test` for one release as fallback).
- Update `docs/NVM.md` and `CONTRIBUTING.md` for Vite usage.
- Keep `Gruntfile.coffee` for one release (or remove after verification — decide in step 10).

### 3.2 Out of scope

- Do not change `CartJS.*` public API or `data-cart-*` HTML contract.
- Do not change `src/*.js` logic (already vanilla JS).
- Do not migrate `terraform` docs or `less` to Vite plugins in this plan (later plan).
- Do not change Tinybind/Mepto integration (plans 002, 004).
- Do not rename `dist/*` files.

## 4. Inputs

- `Gruntfile.coffee` (`concat:build_js`, `concat:build`, `uglify:build`, `watch`, `terraform`, `less`)
- `src/*.js` (10 files including `mepto-adapter.js`, already IIFE-wrapped via `concat` banner/footer)
- `src/coffee-backup/*.coffee` (reference)
- `package.json` (`grunt@1.6.3`, 9 `grunt-contrib-*`, `vite` via `vitest@4.1.10` already)
- `dist/cart.js` (current IIFE + `CartJS.factory` UMD) and `dist/rivets-cart.js`
- `https://vitejs.dev/` (Vite 5/6 docs, `build.lib`, `build.rollupOptions`)

## 5. Findings (evidence)

### 5.1 Current Grunt does three things we must replicate

1. **Join + IIFE:** `concat:build_js` does `banner: '<%= meta.banner %>(function() {\n'` + `separator: ';'` + `footer: '\n}).call(window)'` to wrap 10 `src/*.js` files into one IIFE that defines `CartJS` and then exports via `CartJS.factory(this.CartJS = {})` in `src/export.js`.
2. **Bundle rivets-cart:** `concat:build` does `tinybind.js + dist/cart.js` → `dist/rivets-cart.js` (no extra IIFE, just banner).
3. **Minify:** `uglify` does `dist/cart.js → dist/cart.min.js` and `dist/rivets-cart.js → dist/rivets-cart.min.js` with same banner and `report: 'gzip'`.

### 5.2 Vite can replicate each step

From `https://vitejs.dev/config/build-options`:

- `build.lib.entry: 'src/cart.js'` is not correct — CartJS is multi-file `concat`, not single entry. Use `build.rollupOptions.input: 'src/cart.js'` with `import` chain, or keep `src/*.js` as IIFE via `rollupOptions` and `output.banner/footer`.
- Simpler for drop-in: keep `src/*.js` as separate files and let Vite `build` do `lib` with `formats: ['iife']`, `name: 'CartJS'`, `fileName: () => 'cart.js'`. But CartJS already defines `window.CartJS` via IIFE, not via Vite `name`. Using Vite `iife` with `name` would create `var CartJS = (function(){...})()` which would duplicate. Better to use Vite with `rollupOptions` that just concatenates and wraps, not re-defines `CartJS`.
- Alternative minimal Vite config (recommended for drop-in):
  ```js
  // vite.config.js
  export default {
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: false,
      rollupOptions: {
        input: {
          'cart': 'src/cart.js', // not used — we concat manually
        }
      }
    }
  }
  ```
  For true drop-in, use `vite` only to run `esbuild` minify and to replace `grunt watch` — keep `concat` logic via Vite plugin `vite-plugin-concat` or via `rollupOptions` with `output.banner/footer`.

- Most faithful: create `vite.config.js` that defines two builds via `build.rollupOptions`:
  - `cart`: input is virtual entry that imports `src/cart.js` ... `src/export.js` in order, output `dist/cart.js` as `iife` with `banner` and `footer` matching Grunt.
  - `rivets-cart`: input is `dist/cart.js` + `tinybind`, output `dist/rivets-cart.js`.

- Vite `minify: 'esbuild'` replicates `uglify` but with modern `esbuild` (faster). Keep `dist/*.min.js` as separate `build` with `minify: true`.

### 5.3 Vite already present via Vitest

`vitest@4.1.10` depends on `vite@6.x`. Running `npx vite --version` will show `6.x` without adding new dep, but `package.json` should still list `vite@^6.0.0` explicitly for `build` script.

## 6. Procedure

Do the steps in order. One action per step. Verify after each step. Keep API identical.

1. Install Vite: `npm install --save-dev vite@latest` (check `npm view vite version` first via web search or `npm view`). Verify `npx vite --version` on `node 24.19.0`.
2. Create `vite.config.js` (or `mjs`) at project root:
   - Import `fs`, `path`, define `banner` from `package.json` (`// Cart.js\n// version: ${pkg.version}\n// author: ${pkg.author}\n// license: ${pkg.license}\n`).
   - Define `srcOrder = ['src/mepto-adapter.js','src/cart.js','src/item.js','src/cartjs.js','src/utils.js','src/queue.js','src/core.js','src/data.js','src/rivets.js','src/export.js']`.
   - Export config with `build.outDir: 'dist'`, `build.emptyOutDir: false`, `build.minify: false` for `cart.js` (do minify separately), `build.rollupOptions.input` as virtual entry that concatenates `srcOrder` with banner/footer IIFE.
   - Add second build for `rivets-cart` via `build.rollupOptions` or via second Vite config / plugin that does `tinybind + dist/cart.js`.
   Simplest: use `rollupOptions` with `input: 'src/export.js'` and `output: { format: 'iife', banner, footer, name: 'CartJS', file: 'dist/cart.js' }` — but this requires `src/*.js` to be ES modules with `import` — they are not. So use `vite-plugin-concat` or keep Grunt `concat` for now and let Vite only do `uglify` replacement.
   Recommended for this plan (minimal risk):
   - Keep `concat:build_js` logic in Vite via `plugins: [ { name: 'concat-cart', buildStart() { this.emitFile(...) } } ]` or via `rollup-plugin-copy` — but easiest is to use Vite `build.lib` with `entry: 'src/cart.js'` that `import`s all other `src/*.js` via a temporary `src/index.js` that does `import './mepto-adapter.js'; import './cart.js'; ...` and then Vite bundles it as IIFE.
   Document chosen approach in `vite.config.js` comments.
3. Add `src/index.js` (or `src/entry.js`) as Vite entry that imports all `src/*.js` in Grunt order (only if using `build.lib` approach). If not, skip this file.
4. Configure `vite build` to output `dist/cart.js` (IIFE, banner, no minify) and `dist/cart.min.js` (same but `minify: true`), and `dist/rivets-cart.js` / `dist/rivets-cart.min.js` (IIFE with `tinybind`).
5. Update `package.json` scripts:
   ```
   "build": "vite build",
   "watch": "vite build --watch",
   "test": "vitest run",
   "build:grunt": "grunt build" // keep for one release
   ```
6. Build: `npx vite build` must succeed and `dist/cart.js` must start with `// Cart.js` banner and `(function() {` and end with `}).call(window);`.
7. Compare `dist/cart.js` from Vite vs Grunt: `diff -u dist/cart.js.grunt-bak dist/cart.js` must show only whitespace/minor helper differences, no API change.
8. Build minified: `npx vite build --minify` or second config with `minify: 'esbuild'` must produce `dist/*.min.js` smaller than `dist/*.js` and `gzip -c dist/cart.min.js | wc -c` similar to Grunt `uglify` (≈ 40k).
9. Test: `npx vite build && npx vitest run` (happy-dom) with `spec/cartjs/tinybind-dropin.js` and `spec/cartjs/mepto-dropin.js` must pass. `spec/runner.html` still loads `tinybind` + `meptos` + `dist/cart.js`.
10. Decide on `Gruntfile.coffee`: keep for one release (`build:grunt` script) or remove after Vite verified. Document in `CHANGELOG.md`.
11. Update `docs/NVM.md` and `README.md`: replace `npx grunt build` with `npm run build` (Vite) and note `npm run build:grunt` fallback.
12. Keep `grunt-contrib-*` in `package.json` for one release, then remove in next major. Add `vite` to `devDependencies`.

## 7. Constraints (vital — API must remain same)

- **Public CartJS API frozen:** `CartJS.*`, `data-cart-*`, `window.CartJS`, `window.rivets`/`tinybind`, `window.jQuery`/`$`/`mepto` — do not change.
- **Filenames frozen:** `dist/cart.js`, `dist/rivets-cart.js`, `dist/*.min.js`, `docs/theme/assets/rivets-cart.min.js` must stay at same paths.
- **Banner frozen:** `// Cart.js\n// version: <%= pkg.version %>\n// author: ...\n// license: MIT` must stay at top of `dist/*.js` and `dist/*.min.js`.
- **IIFE wrapper frozen:** `dist/cart.js` must still be `(function(){...}).call(window)` so `Cart`/`Item` do not leak to global.
- **Build must be reproducible:** `npm run build` on `node 24.19.0` must produce same `dist` as `grunt build` (within `esbuild` vs `uglify` minify tolerance).
- Follow STE100 for all new MD files.

## 8. Risks

- Vite `esbuild` minify vs `uglify-js@3` may produce different `dist/*.min.js` bytes — themes that SRI-hash `rivets-cart.min.js` will break. Mitigation: keep `uglify` for one release and compare `gzip` sizes; document as **minor** not **patch**.
- `src/*.js` are not ES modules (`CartJS` is global, not `export`). Vite `build.lib` expects `export` — if you use `import` entry, you must add `export { CartJS }` to `src/export.js` temporarily.
- `vite --watch` vs `grunt watch` on `src/*.js` — Vite watches `src/index.js` imports, not `src/*.js` directly — ensure `srcOrder` is explicit.
- `terraform`/`less` docs still use Grunt — do not remove Grunt entirely in this plan.

## 9. Acceptance criteria (drop-in)

- [ ] `vite@latest` installed, `npx vite --version` works on `node 24.19.0`.
- [ ] `vite.config.js` exists and defines `cart` and `rivets-cart` IIFE builds with correct banner/footer.
- [ ] `npm run build` (Vite) succeeds and `dist/cart.js` starts with banner and `(function() {` and ends with `}).call(window);`.
- [ ] `diff dist/cart.js` (Vite) vs Grunt shows no API change (only whitespace/minify diff).
- [ ] `dist/rivets-cart.js` still contains `tinybind` + `cart` and `dist/*.min.js` exist.
- [ ] `npm run build --watch` watches `src/*.js`.
- [ ] `npx vitest run` (happy-dom) with `tinybind-dropin` and `mepto-dropin` passes.
- [ ] `npx grunt build` still works via `build:grunt` for one release.
- [ ] This file `plans/005-vite-build-plan.md` follows STE100 and references `https://vitejs.dev/` and `AGENTS.md`.

## 10. Output

This plan file `plans/005-vite-build-plan.md`. Execution produces: `vite.config.js` (or `mjs`), `src/index.js` (if needed), `package.json` (vite dep + scripts), `dist/*` (Vite-built), updated docs, and a commit referencing this plan.

## 11. STE100 checklist

- [ ] Each sentence ≤ 20 words.
- [ ] Each paragraph ≤ 6 sentences.
- [ ] One topic per sentence.
- [ ] Active voice only.
- [ ] Approved words only.
- [ ] Vertical lists for procedures.

## 12. References

- Prompt: user request 2026-08-07 `now make a plan to update the build process to use vite`
- Tool: `https://vitejs.dev/` (Vite 6, `build.lib`, `build.rollupOptions`, `esbuild`)
- Build: `Gruntfile.coffee`, `package.json` (`grunt@1.6.3`, `vitest@4.1.10` already uses `vite`)
- Source: `src/*.js` (10 files including `mepto-adapter.js`, vanilla JS), `src/coffee-backup`
- Bundle: `dist/cart.js` (IIFE), `dist/rivets-cart.js` (tinybind)
- Plans: `002` (tinybind), `003` (decaffeinate), `004` (mepto)
- AGENTS.md §2, §3 (no API break), §4.2 (STE100)
- Node: `24.19.0` (`.nvmrc`, `.tool-versions`)
