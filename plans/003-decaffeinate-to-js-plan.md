# 003 — Convert CoffeeScript to Vanilla JavaScript with Decaffeinate — Drop-in Plan

> Standard: ASD-STE100 Simplified Technical English, Issue 8
> Reference: `https://github.com/decaffeinate/decaffeinate`, `plans/002-tinybind-dropin-plan.md`, `AGENTS.md 3`
> Status: Draft — execution follows this plan step-by-step
> Risk level: Medium — API must remain identical

## 1. Objective

Convert all CartJS CoffeeScript source (`src/*.coffee`, 9 files, 728 lines) to vanilla JavaScript with `decaffeinate`. Keep every public API identical. The result must be a drop-in for Shopify themes.

**Vital constraint:** CartJS is a drop-in. Themes call `CartJS.*` and use `data-cart-*`. Do not change the contract. If the API changes, the update is not a drop-in.

## 2. Context

CartJS source is 100% CoffeeScript (1.x style):

- `src/cart.coffee` — Cart model
- `src/item.coffee` — Item model
- `src/cartjs.coffee` — `CartJS` namespace and `init`/`configure`
- `src/utils.coffee` — `CartJS.Utils`
- `src/queue.coffee` — `CartJS.Queue`
- `src/core.coffee` — `CartJS.Core` (addItem, updateItem, etc.)
- `src/data.coffee` — `CartJS.Data` (data-* API)
- `src/rivets.coffee` — `CartJS.Rivets` (now Tinybind drop-in from plan 002)
- `src/export.coffee` — UMD export

`Gruntfile.coffee:coffee:build` currently joins them via `grunt-contrib-coffee` into `dist/cart.js`, then `concat` adds `tinybind` to `dist/rivets-cart.js`.

Decaffeinate (`https://github.com/decaffeinate/decaffeinate`) converts CoffeeScript to modern JavaScript. Use it to remove the CoffeeScript build step. This also removes the need to decaffeinate Rivets — Tinybind `1.0.0` is already ES6 (see plan 002). Only CartJS `src/*.coffee` needs conversion.

Current build: `CoffeeScript → JS (via grunt-contrib-coffee) → concat → uglify`
Target build: `JS (decaffeinated, checked in) → concat → uglify` (no CoffeeScript compile)

## 3. Scope

### 3.1 In scope

- Install `decaffeinate` and `decaffeinate-parser` for one-time conversion.
- Convert `src/*.coffee` → `src/*.js` with `decaffeinate`.
- Keep `src/*.coffee` as `src/*.coffee.bak` for one release (or remove after verification — decide in step 8).
- Update `Gruntfile.coffee` → `Gruntfile.js` or update `coffee:build` to `js:copy` (or remove coffee task).
- Update `package.json` scripts and `devDependencies` (remove `grunt-contrib-coffee` if no longer needed, or keep for backward compat).
- Update docs for contributors (how to edit `src/*.js` now).
- Verify `dist/cart.js` and `dist/rivets-cart.js` are byte-identical or behavior-identical to CoffeeScript build.

### 3.2 Out of scope

- Do not change `CartJS.*` public API or `data-cart-*` HTML contract.
- Do not change Tinybind integration (plan 002) — keep `window.rivets === window.tinybind`.
- Do not do Grunt→Vite migration (later plan).
- Do not decaffeinate `node_modules/rivets/src` — already replaced by Tinybind.

## 4. Inputs

- `src/*.coffee` (9 files)
- `https://github.com/decaffeinate/decaffeinate` (README, `--use-cs2`, `--loose` options)
- `Gruntfile.coffee` (`coffee`, `concat`, `uglify` config)
- `package.json` (`grunt-contrib-coffee@2.1.0`)
- `dist/cart.js` (reference output from CoffeeScript build)
- `spec/runner.html` and `spec/cartjs/*.js` (formatter tests, tinybind-dropin tests)

## 5. Findings (evidence)

### 5.1 What Decaffeinate does

From `https://github.com/decaffeinate/decaffeinate`:

- Install: `npm install -g decaffeinate` or `npm install --save-dev decaffeinate`
- Usage: `decaffeinate src/cart.coffee` → `src/cart.js`; `decaffeinate src/*.coffee` converts each file in place.
- Options: `--use-cs2` for CoffeeScript 2 compatibility (CartJS uses CS 1.x, so default is fine); `--loose` for simpler output; `--keep-commonjs` vs `--use-js-modules` for import/export. CartJS uses UMD via `src/export.coffee`, so keep CommonJS/UMD for now, do not switch to ES modules in this plan.
- Decaffeinate leaves `TODO` comments where manual fix is needed (e.g., `/* TODO: This file has manual fixes */`). You must review each `*.js`.

### 5.2 CartJS CoffeeScript is straightforward

All `src/*.coffee` use simple classes, objects, and jQuery. No advanced CoffeeScript features (no `◊`, no complex comprehensions). Example from `src/rivets.coffee` already converted via manual ES6 in plan 002 shows the pattern: `CartJS.Rivets = { model: null, boundViews: [], init: () -> ... }` becomes `CartJS.Rivets = { model: null, boundViews: [], init() { ... } }`. Decaffeinate will produce similar output with `__extends`, `__bind` helpers where needed.

### 5.3 Why not decaffeinate Rivets

Rivets source lives in `node_modules/rivets/src/*.coffee` (9 files) and is abandoned. Tinybind `1.0.0` already provides the same binding engine in ES6. Converting Rivets would be wasted work and would keep CoffeeScript debt. Plan 002 already replaces it.

## 6. Procedure

Do the steps in order. One action per step. Verify after each step. Keep API identical.

1. Install Decaffeinate: `npm install --save-dev decaffeinate@latest` (pin version, e.g., `2.52.x`). Do not install globally.
2. Verify install: `npx decaffeinate --version` and `npx decaffeinate --help` (check `--use-cs2`, `--loose` flags).
3. Back up `src/*.coffee`: `mkdir -p src/coffee-backup && cp src/*.coffee src/coffee-backup/` (or `*.coffee.bak`) for diff reference.
4. Run Decaffeinate on each CartJS file (do not run on `node_modules`):
   ```
   npx decaffeinate src/cart.coffee --keep-commonjs
   npx decaffeinate src/item.coffee --keep-commonjs
   npx decaffeinate src/cartjs.coffee --keep-commonjs
   npx decaffeinate src/utils.coffee --keep-commonjs
   npx decaffeinate src/queue.coffee --keep-commonjs
   npx decaffeinate src/core.coffee --keep-commonjs
   npx decaffeinate src/data.coffee --keep-commonjs
   npx decaffeinate src/rivets.coffee --keep-commonjs
   npx decaffeinate src/export.coffee --keep-commonjs
   ```
   Or single command: `npx decaffeinate src/*.coffee` (check it does not overwrite backup).
5. Review each generated `src/*.js` for `TODO` comments. Fix manually where Decaffeinate inserts `/* TODO */` (common: `__guard__` for `if rivets?`, `__indexOf` for `indexOf`, `__slice` for splats). Keep the logic identical to original CoffeeScript.
6. Run `npx grunt build` — it will now fail because `grunt-contrib-coffee` still expects `src/*.coffee` but `dist/cart.js` is now built from `src/*.js`? Update `Gruntfile.coffee`:
   - Option A (minimal): keep `Gruntfile.coffee` but change `coffee:build:files 'dist/cart.js': ['src/*.js']` and set `coffee` task to copy or use `concat` directly.
   - Option B (clean): rename `Gruntfile.coffee` → `Gruntfile.js` and replace `coffee:build` with `concat:js` that joins `src/*.js` in the same order as before (`cart.coffee`, `item.coffee`, `cartjs.coffee`, `utils.coffee`, `queue.coffee`, `core.coffee`, `data.coffee`, `rivets.coffee`, `export.coffee` → now `.js`).
   Keep the file order identical (see `Gruntfile.coffee:18-29`). Verify `dist/cart.js` content still starts with `// Cart.js` banner and defines `CartJS`, `Cart`, `Item`.
7. Build again: `npx grunt build` must succeed (`coffee:build` or new `concat:js` → `concat:build` → `uglify:build`).
8. Diff `dist/cart.js` against CoffeeScript-built `dist/cart.js.bak` (save before step 6). The diff must be minimal and not change API: same `CartJS.*` methods, same `rivets.formatters`, same `window.rivets === window.tinybind` alias. Use `diff -u` or `npm run build && diff dist/cart.js dist/cart.js.bak` — note any helper renames (`__bind`, `__hasProp`) are acceptable if behavior is identical.
9. Run `npx grunt docs` to ensure `terraform` docs still compile with new JS source.
10. Run tests: `spec/cartjs/formatters.js` and `spec/cartjs/tinybind-dropin.js` via `spec/runner.html` (phantomjs currently broken on `mocha@11.8` — use `vitest` happy-dom as in plan 002 verification, or `npx vitest run` with jsdom). All formatter tests must pass without edit.
11. Keep `src/*.coffee.bak` for one release for review, then remove in next plan. Or delete immediately if `dist` diff is clean — decide and document in `CHANGELOG.md`.
12. Update `package.json`: remove `grunt-contrib-coffee` from `devDependencies` only after `Gruntfile` no longer uses it; keep it otherwise. Add `decaffeinate` to `devDependencies` for future contributors.
13. Update `CONTRIBUTING.md` / `docs/NVM.md`: instruct contributors to edit `src/*.js` (not `src/*.coffee`) and to run `npx grunt build` (no CoffeeScript compile).
14. Commit: `src/*.js` (9 files), `Gruntfile` change, `package.json`, `dist/*` (rebuilt), and this plan file. Keep commit message referencing this plan and `https://github.com/decaffeinate/decaffeinate`.

## 7. Constraints (vital — API must remain same)

- **Public CartJS API frozen:** `CartJS.init`, `CartJS.configure`, `CartJS.cart`, `CartJS.Core.*`, `CartJS.Data.*`, `CartJS.Rivets.*`, `CartJS.settings.*` — do not change signature or return value.
- **Formatters/binders frozen:** All Rivets/Tinybind formatters and `data-cart-*` attributes must work without theme edit.
- **Bundle filenames frozen:** `dist/cart.js`, `dist/rivets-cart.js`, `dist/*.min.js` must stay at same paths.
- **Window globals frozen:** `window.CartJS`, `window.rivets`, `window.tinybind` must remain `===` after conversion.
- **No Rivets decaffeinate:** Do not convert `node_modules/rivets/src` — Tinybind already replaces it (plan 002).
- **One file at a time:** Convert `src/*.coffee` individually and verify each, do not bulk-convert and hope.
- Follow STE100 for all new MD files.

## 8. Risks

- Decaffeinate inserts `__guard__` helpers for `if rivets?` that may change `typeof` checks. Review `src/rivets.coffee` conversion carefully — our plan 002 shim does `typeof tinybind !== "undefined"` which must survive conversion.
- `grunt-contrib-coffee` removal breaks `npx grunt build` if `Gruntfile.coffee` still references it. Mitigation: keep the plugin until `Gruntfile.js` is stable, or make `coffee` task a no-op.
- `src/export.coffee` UMD wrapper (`if typeof exports` / `define`) must stay as CommonJS/UMD — do not convert to `import/export` (`--use-js-modules`) in this plan; that is for a later ES modules plan.
- File order matters: `Gruntfile` join order is `cart`, `item`, `cartjs`, `utils`, `queue`, `core`, `data`, `rivets`, `export`. Keep it.

## 9. Acceptance criteria (drop-in)

- [ ] `src/*.js` (9 files) exist, each converted via `decaffeinate` and manually reviewed (no `TODO` left).
- [ ] `src/*.coffee` backed up as `src/*.coffee.bak` or `src/coffee-backup/` for one release.
- [ ] `npx grunt build` succeeds without `grunt-contrib-coffee` compile error.
- [ ] `dist/cart.js` and `dist/rivets-cart.js` build and contain `CartJS`, `tinybind`, and `window.rivets === window.tinybind`.
- [ ] `diff dist/cart.js` vs CoffeeScript build shows no API change (only helper renames).
- [ ] All `spec/cartjs/formatters.js` and `spec/cartjs/tinybind-dropin.js` pass (via `vitest` happy-dom or `grunt test` when phantomjs fixed).
- [ ] `npx grunt docs` succeeds.
- [ ] No change to `CartJS.*` public API (smoke test `CartJS.addItem`, `CartJS.clear`).
- [ ] This file `plans/003-decaffeinate-to-js-plan.md` follows STE100 and references `https://github.com/decaffeinate/decaffeinate` and `AGENTS.md`.

## 10. Output

This plan file `plans/003-decaffeinate-to-js-plan.md`. Execution produces: `src/*.js` (9), `Gruntfile.js` (or updated `Gruntfile.coffee`), `package.json`, `dist/*`, updated docs, and a commit referencing this plan.

## 11. STE100 checklist

- [ ] Each sentence ≤ 20 words.
- [ ] Each paragraph ≤ 6 sentences.
- [ ] One topic per sentence.
- [ ] Active voice only.
- [ ] Approved words only.
- [ ] Vertical lists for procedures.

## 12. References

- Prompt: user request 2026-08-07 `now make a plan to use https://github.com/decaffeinate/decaffeinate`
- Plan 002: `plans/002-tinybind-dropin-plan.md` (Tinybind replaces Rivets)
- Tool: `https://github.com/decaffeinate/decaffeinate` (README, `--keep-commonjs`)
- Source: `src/*.coffee` (9 files, 728 lines)
- Build: `Gruntfile.coffee`, `package.json`
- Tests: `spec/runner.html`, `spec/cartjs/*.js`
- AGENTS.md §2 (Mepto), §3 (no API break), §4.2 (STE100)
